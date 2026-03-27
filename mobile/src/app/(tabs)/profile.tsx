import EditProfile from "@/components/EditProfile";
import { useThemePreference, type ThemePreference } from "@/contexts/theme.context";
import { getMe } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MENU_ITEMS = [
  { icon: "notifications", label: "Notifications", color: COLORS.primary, badge: 3 },
  // { icon: "chatbubbles", label: "My Chats", color: COLORS.accent },
  // { icon: "people", label: "Friends", color: COLORS.accentSecondary },
  { icon: "settings", label: "Settings", color: COLORS.textMuted },
];

const STATS = [
  { label: "Messages", value: "69", icon: "chatbubble-ellipses" },
  { label: "Friends", value: "67", icon: "people" },
  // { label: "Groups", value: "9", icon: "people-circle" },
];

const ProfileScreen = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [dbUsername, setDbUsername] = useState<string | null>(null);
  const { preference, setPreference, resolvedTheme } = useThemePreference();

  useEffect(() => {
    getMe().then((data: any) => {
      if (data?.username) setDbUsername(data.username);
    }).catch(() => { });
  }, [editModalVisible]); // re-fetch after edit modal closes

  const handleMenuItemPress = (label: string) => {
    Alert.alert(label, `${label} feature coming soon!`);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-2 pb-4 z-50">
            <Text className="text-3xl font-black text-foreground dark:text-foreground-dark tracking-tighter">Profile</Text>
            <Pressable
              onPress={() => setEditModalVisible(true)}
              hitSlop={20}
              className="w-12 h-12 rounded-2xl bg-surface-elevated dark:bg-surface-elevated-dark items-center justify-center shadow-md border border-border dark:border-border-dark active:scale-95"
            >
              <Ionicons name="pencil-sharp" size={20} color={COLORS.primary} />
            </Pressable>
          </View>

          {/* PROFILE CARD */}
          <View className="items-center">
            <View className="relative">
              <View className="p-1.5 bg-surface-elevated dark:bg-surface-elevated-dark rounded-3xl shadow-xl shadow-primary/20 border border-border dark:border-border-dark">
                <Image
                  source={user?.imageUrl}
                  style={{ width: 110, height: 110, borderRadius: 32 }}
                  contentFit="cover"
                />
              </View>
              <View className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-success border-4 border-surface-elevated dark:border-surface-elevated-dark shadow-sm" />
            </View>

            <View className="items-center mt-4">
              <Text className="text-2xl font-black text-foreground dark:text-foreground-dark tracking-tight">
                {user?.fullName || user?.username || "User"}
              </Text>
              {dbUsername ? (
                <Text className="text-sm font-bold text-primary mt-0.5">@{dbUsername}</Text>
              ) : null}
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
                <View key={index} className="flex-1 mx-1.5 bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center shadow-sm">
                  <View className="w-10 h-10 rounded-2xl bg-surface dark:bg-surface-dark items-center justify-center mb-2">
                    <Ionicons name={stat.icon as any} size={20} color={COLORS.primary} />
                  </View>
                  <Text className="text-xl font-black text-foreground dark:text-foreground-dark">{stat.value}</Text>
                  <Text className="text-[9px] uppercase font-black text-foreground-subtle dark:text-foreground-subtle-dark tracking-[1px]">{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* MENU ITEMS */}
          <View className="px-6 mt-8">
            <Text className="text-[10px] font-black text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-[2px] ml-2 mb-3">ACCOUNT</Text>
            <View className="bg-surface-elevated dark:bg-surface-elevated-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden shadow-sm shadow-black/5">
              {MENU_ITEMS.map((item, index) => (
                <Pressable
                  key={index}
                  className="flex-row items-center px-6 py-5 active:bg-surface dark:active:bg-surface-dark border-b border-border dark:border-border-dark"
                  onPress={() => handleMenuItemPress(item.label)}
                >
                  <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text className="flex-1 ml-4 text-[15px] font-bold text-foreground-muted dark:text-foreground-muted-dark">{item.label}</Text>
                  {item.badge && (
                    <View className="bg-primary h-6 w-6 rounded-lg items-center justify-center">
                      <Text className="text-[10px] font-black text-slate-50">{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={resolvedTheme === "dark" ? "#7A8495" : "#D1D5DB"} />
                </Pressable>
              ))}
            </View>
          </View>

          <View className="px-6 mt-6">
            <Text className="text-[10px] font-black text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-[2px] ml-2 mb-3">THEME</Text>
            <View className="bg-surface-elevated dark:bg-surface-elevated-dark rounded-2xl border border-border dark:border-border-dark p-4 shadow-sm shadow-black/5">
              <Text className="text-sm font-bold text-foreground-muted dark:text-foreground-muted-dark mb-3">
                Current: {resolvedTheme === "dark" ? "Dark" : "Light"}
              </Text>
              <View className="flex-row gap-2">
                {([
                  { key: "system", label: "System" },
                  { key: "light", label: "Light" },
                  { key: "dark", label: "Dark" },
                ] as Array<{ key: ThemePreference; label: string }>).map((mode) => {
                  const active = preference === mode.key;
                  return (
                    <Pressable
                      key={mode.key}
                      onPress={() => setPreference(mode.key)}
                      className={`flex-1 h-10 rounded-xl items-center justify-center ${active ? "bg-primary" : "bg-surface dark:bg-surface-dark"}`}
                    >
                      <Text className={`text-xs font-bold ${active ? "text-slate-50" : "text-foreground-muted dark:text-foreground-muted-dark"}`}>
                        {mode.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* SIGN OUT */}
          <View className="px-6 mt-6">
            <Pressable
              className="w-full bg-red-50 border border-red-200 dark:bg-surface-elevated-dark dark:border-red-400/45 h-14 rounded-xl flex-row items-center justify-center active:bg-red-100 dark:active:bg-surface-dark"
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
              <Ionicons
                name="log-out-outline"
                size={19}
                color={resolvedTheme === "dark" ? "#FCA5A5" : "#EF4444"}
              />
              <Text className="ml-2.5 text-[15px] font-extrabold text-red-500 dark:text-red-300 tracking-wide">
                Sign Out
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <EditProfile
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        currentUsername={dbUsername}
      />
    </View>
  );
};

export default ProfileScreen;