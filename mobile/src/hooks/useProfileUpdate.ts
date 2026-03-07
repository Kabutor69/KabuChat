import { useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

type ProfileUpdateError = {
  errors?: Array<{ message: string }>;
  message?: string;
};

export const useProfileUpdate = () => {
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async (): Promise<boolean> => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to change your profile picture.",
        );
        return false;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        return true;
      }

      return false;
    } catch (error) {
      Sentry.logger.error("Error picking image", { error });
      Sentry.captureException(error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      return false;
    }
  };

  const updateProfile = async (
    firstName: string,
    lastName: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not available" };
    }

    try {
      setIsSaving(true);

      // Update profile image first if a new one was selected
      if (selectedImage) {
        try {
          const filename = selectedImage.split("/").pop() || "profile.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          const imageFile = {
            uri: selectedImage,
            name: filename,
            type: type,
          } as any;

          await user.setProfileImage({
            file: imageFile,
          });

          Sentry.logger.info("Profile image updated successfully", {
            userId: user.id,
          });
        } catch (imageError) {
          Sentry.logger.error("Error updating profile image", {
            error: imageError,
            userId: user?.id,
          });
          throw imageError;
        }
      }

      // Update name fields
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      Sentry.logger.info("Profile updated successfully", {
        userId: user.id,
        hasNewImage: !!selectedImage,
      });

      // Clear selected image after successful update
      setSelectedImage(null);

      return { success: true };
    } catch (error: unknown) {
      const err = error as ProfileUpdateError;
      const errorMessage =
        err?.errors?.[0]?.message || err?.message || "Failed to update profile";

      Sentry.logger.error("Error updating profile", {
        error,
        userId: user?.id,
      });
      Sentry.captureException(error);

      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  };

  const resetSelectedImage = () => {
    setSelectedImage(null);
  };

  return {
    isSaving,
    selectedImage,
    pickImage,
    updateProfile,
    resetSelectedImage,
  };
};
