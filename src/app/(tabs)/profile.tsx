import { COLORS } from "@/lib/theme";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import * as Sentry from "@sentry/react-native";
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
import { SafeAreaView } from "react-native-safe-area-context";

const MENU_ITEMS = [
  { icon: "notifications", label: "Notifications", color: COLORS.primary, badge: 3 },
  { icon: "chatbubbles", label: "My Chats", color: COLORS.accent },
  { icon: "people", label: "Friends", color: COLORS.accentSecondary },
  { icon: "settings", label: "Settings", color: COLORS.textMuted },
];

const STATS = [
  { label: "Messages", value: "127", icon: "chatbubble-ellipses" },
  { label: "Friends", value: "42", icon: "people" },
  { label: "Groups", value: "9", icon: "people-circle" }, 
];

const ProfileScreen = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const { isSaving, selectedImage, pickImage, updateProfile, resetSelectedImage } = useProfileUpdate();

  const handleMenuItemPress = (label: string) => {
    Alert.alert(label, `${label} feature coming soon!`);
  };

  const handleSaveProfile = async () => {
    const result = await updateProfile(firstName, lastName);
    if (result.success) {
      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
    } else {
      Alert.alert("Error", result.error || "Failed to update profile.");
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Background Gradient */}
      <View className="absolute inset-0 z-0">
        <LinearGradient colors={["#FFFFFF", "#F8F9FA", "#F1F3F5"]} style={{ flex: 1 }} />
      </View>

      <SafeAreaView className="flex-1 z-10" edges={['top']}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-2 pb-4 z-50">
            <Text className="text-3xl font-black text-foreground tracking-tighter">Profile</Text>
            <Pressable 
              onPress={() => {
                setFirstName(user?.firstName || "");
                setLastName(user?.lastName || "");
                resetSelectedImage(); 
                setEditModalVisible(true);
              }}
              hitSlop={20}
              className="w-12 h-12 rounded-2xl bg-white items-center justify-center shadow-md border border-slate-100 active:scale-95"
            >
              <Ionicons name="pencil-sharp" size={20} color={COLORS.primary} />
            </Pressable>
          </View>

          {/* PROFILE CARD */}
          <View className="items-center">
            <View className="relative">
              <View className="p-1.5 bg-white rounded-[38px] shadow-xl shadow-primary/20 border border-slate-50">
                <Image
                  source={user?.imageUrl}
                  style={{ width: 110, height: 110, borderRadius: 32 }}
                  contentFit="cover"
                />
              </View>
              <View className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-success border-4 border-white shadow-sm" />
            </View>

            <View className="items-center mt-4">
              <Text className="text-2xl font-black text-foreground tracking-tight">
                {user?.fullName || user?.username || "User"}
              </Text>
              <View className="mt-1 bg-primary/10 px-4 py-1.5 rounded-full flex-row items-center">
                <Ionicons name="mail" size={12} color={COLORS.primary} />
                <Text className="ml-2 text-[11px] font-bold text-primary">
                  {user?.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            </View>

            {/* STATS SECTION */}
            <View className="flex-row w-full px-6 mt-8 justify-between">
              {STATS.map((stat, index) => (
                <View key={index} className="flex-1 mx-1.5 bg-white border border-slate-50 rounded-[28px] p-4 items-center shadow-sm">
                  <View className="w-10 h-10 rounded-2xl bg-slate-50 items-center justify-center mb-2">
                    <Ionicons name={stat.icon as any} size={20} color={COLORS.primary} />
                  </View>
                  <Text className="text-xl font-black text-foreground">{stat.value}</Text>
                  <Text className="text-[9px] uppercase font-black text-slate-400 tracking-[1px]">{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* MENU ITEMS */}
          <View className="px-6 mt-8">
            <Text className="text-[10px] font-black text-slate-300 uppercase tracking-[2px] ml-2 mb-3">ACCOUNT</Text>
            <View className="bg-white rounded-[32px] border border-slate-50 overflow-hidden shadow-sm shadow-black/5">
              {MENU_ITEMS.map((item, index) => (
                <Pressable
                  key={index}
                  className="flex-row items-center px-6 py-5 active:bg-slate-50 border-b border-slate-50"
                  onPress={() => handleMenuItemPress(item.label)}
                >
                  <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text className="flex-1 ml-4 text-[15px] font-bold text-slate-600">{item.label}</Text>
                  {item.badge && (
                    <View className="bg-primary h-6 w-6 rounded-lg items-center justify-center">
                      <Text className="text-[10px] font-black text-white">{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#E2E8F0" />
                </Pressable>
              ))}
            </View>
          </View>

          {/* SIGN OUT */}
          <View className="px-6 mt-6">
            <Pressable
              className="w-full bg-red-50/50 border border-red-100 h-16 rounded-[28px] flex-row items-center justify-center active:bg-red-50"
              onPress={async () => {
                Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await signOut();
                        Sentry.logger.info("User signed out successfully", { userId: user?.id });
                      } catch (error) {
                        Sentry.captureException(error);
                      }
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="ml-3 text-base font-black text-red-500">Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-[40px] p-8 shadow-2xl max-h-[85%]">
            <View className="w-12 h-1.5 bg-slate-100 rounded-full self-center mb-6" />
            
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black text-foreground">Edit Profile</Text>
              <Pressable onPress={() => setEditModalVisible(false)} className="h-10 w-10 rounded-full bg-slate-50 items-center justify-center">
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
                onPress={() => setEditModalVisible(false)}
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
    </View>
  );
};

export default ProfileScreen;