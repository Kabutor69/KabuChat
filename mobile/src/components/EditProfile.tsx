import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useState } from 'react'
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { Image } from "expo-image";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useUser } from "@clerk/clerk-expo";

interface EditProfileProps {
  visible: boolean;
  onClose: () => void;
}

const EditProfile = ({ visible, onClose }: EditProfileProps) => {
    const { user } = useUser();
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const { isSaving, selectedImage, pickImage, updateProfile, resetSelectedImage } = useProfileUpdate();

    const handleSaveProfile = async () => {
        const result = await updateProfile(firstName, lastName);
        if (result.success) {
            onClose();
            Alert.alert("Success", "Profile updated successfully!");
        } else {
            Alert.alert("Error", result.error || "Failed to update profile.");
        }
    };

    const handleClose = () => {
        resetSelectedImage();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 justify-end bg-black/50"
            >
                <View className="bg-white rounded-t-[40px] p-8 shadow-2xl max-h-[85%]">
                    <View className="w-12 h-1.5 bg-slate-100 rounded-full self-center mb-6" />

                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-2xl font-black text-foreground">Edit Profile</Text>
                        <Pressable onPress={handleClose} className="h-10 w-10 rounded-full bg-slate-50 items-center justify-center">
                            <Ionicons name="close" size={20} color={COLORS.textMuted} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="items-center mb-8">
                            <Pressable onPress={pickImage} className="relative">
                                <Image
                                    source={selectedImage || user?.imageUrl}
                                    style={{ width: 100, height: 100, borderRadius: 50 }}
                                    contentFit="cover"
                                />
                                <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-4 border-white shadow-sm">
                                    <Ionicons name="camera" size={14} color="white" />
                                </View>
                            </Pressable>
                        </View>

                        <View className="gap-y-5">
                            <View>
                                <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</Text>
                                <TextInput
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    placeholderTextColor={COLORS.textSubtle}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl px-5 h-14 font-bold text-slate-700"
                                />
                            </View>

                            <View>
                                <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</Text>
                                <TextInput
                                    value={lastName}
                                    onChangeText={setLastName}
                                    placeholderTextColor={COLORS.textSubtle}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl px-5 h-14 font-bold text-slate-700"
                                />
                            </View>

                            <View>
                                <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</Text>
                                <View className="bg-slate-100/50 border border-slate-100 rounded-2xl px-5 h-14 justify-center">
                                    <Text className="font-bold text-slate-400">{user?.primaryEmailAddress?.emailAddress}</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    <View className="flex-row gap-3 mt-8">
                        <Pressable
                            onPress={handleClose}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-full bg-slate-50 items-center"
                        >
                            <Text className="font-bold text-slate-400">Cancel</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleSaveProfile}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-full bg-primary items-center shadow-lg shadow-primary/30"
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text className="font-bold text-white">Save Changes</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

export default EditProfile