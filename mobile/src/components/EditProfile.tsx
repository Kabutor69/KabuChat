import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { checkUsernameAvailable } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from 'react';
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

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

interface EditProfileProps {
    visible: boolean;
    onClose: () => void;
    currentUsername?: string | null;
}

const EditProfile = ({ visible, onClose, currentUsername }: EditProfileProps) => {
    const { user } = useUser();
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [username, setUsername] = useState(currentUsername || "");
    const [usernameStatus, setUsernameStatus] = useState<
        "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged"
    >("unchanged");

    const { isSaving, selectedImage, pickImage, updateProfile, resetSelectedImage } = useProfileUpdate();

    useEffect(() => {
        if (visible) {
            setFirstName(user?.firstName || "");
            setLastName(user?.lastName || "");
            setUsername(currentUsername || "");
            setUsernameStatus("unchanged");
        }
    }, [visible, user, currentUsername]);

    const onUsernameChange = useCallback(async (value: string) => {
        const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setUsername(normalized);

        if (normalized === (currentUsername || "")) {
            setUsernameStatus("unchanged");
            return;
        }

        if (normalized.length < 3) {
            setUsernameStatus(normalized.length === 0 ? "idle" : "invalid");
            return;
        }
        if (!USERNAME_REGEX.test(normalized)) {
            setUsernameStatus("invalid");
            return;
        }

        setUsernameStatus("checking");
        try {
            const { available } = await checkUsernameAvailable(normalized);
            setUsernameStatus(available ? "available" : "taken");
        } catch {
            setUsernameStatus("idle");
        }
    }, [currentUsername]);

    const handleSaveProfile = async () => {
        if (usernameStatus === "taken") {
            Alert.alert("Error", "That username is already taken. Please choose another.");
            return;
        }
        if (username && !USERNAME_REGEX.test(username)) {
            Alert.alert("Error", "Username must be 3-20 characters: letters, numbers, underscores only");
            return;
        }

        const usernameToSave = usernameStatus !== "unchanged" && username ? username : undefined;
        const result = await updateProfile(firstName, lastName, usernameToSave);
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

    const usernameHintColor =
        usernameStatus === "available"
            ? "#22C55E"
            : usernameStatus === "taken" || usernameStatus === "invalid"
                ? "#EF4444"
                : "#94A3B8";

    const usernameHint =
        usernameStatus === "available"
            ? "✓ Username available"
            : usernameStatus === "taken"
                ? "✗ Already taken"
                : usernameStatus === "invalid"
                    ? "3–20 chars: letters, numbers, underscores only"
                    : usernameStatus === "checking"
                        ? "Checking…"
                        : null;

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

                            {/* Username */}
                            <View>
                                <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</Text>
                                <View className="bg-slate-50 border border-slate-100 rounded-2xl px-5 h-14 flex-row items-center">
                                    <Text style={{ color: "#94A3B8", fontWeight: "600", fontSize: 15 }}>@</Text>
                                    <TextInput
                                        value={username}
                                        onChangeText={onUsernameChange}
                                        placeholderTextColor={COLORS.textSubtle}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        placeholder="your_username"
                                        style={{ flex: 1, marginLeft: 4, fontWeight: "700", color: "#334155", height: 56 }}
                                    />
                                    {usernameStatus === "checking" && (
                                        <ActivityIndicator size="small" color="#94A3B8" />
                                    )}
                                </View>
                                {usernameHint ? (
                                    <Text style={{ color: usernameHintColor, fontSize: 11, marginTop: 4, marginLeft: 4 }}>
                                        {usernameHint}
                                    </Text>
                                ) : null}
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
                            disabled={isSaving || usernameStatus === "taken" || usernameStatus === "invalid"}
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