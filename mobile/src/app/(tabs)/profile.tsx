import EditProfile from "@/components/EditProfile";
import { FriendsSection } from "@/components/FriendsSection";
import { useThemePreference, type ThemePreference } from "@/contexts/theme.context";
import { getMe } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { cacheGet, cacheSet } from "@/lib/cache";
import NetInfo from "@react-native-community/netinfo";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileSnapshot = {
  id?: string;
  clerkId?: string;
  fullName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  _updatedAt?: number;
};

const ProfileScreen = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [friendsSectionVisible, setFriendsSectionVisible] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [dbUsername, setDbUsername] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);
  const { preference, setPreference, resolvedTheme } = useThemePreference();

  useEffect(() => {
    NetInfo.fetch().then(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      
      // Use cached profile when offline
      if (offline && !profileSnapshot) {
        const cachedClerk = cacheGet<any>("clerk_user");
        if (cachedClerk) {
          setProfileSnapshot(cachedClerk);
        }
      }
    });
    
    const cached = cacheGet<ProfileSnapshot>("profile_me");
    if (cached) {
      setProfileSnapshot(cached);
      if (cached.username) setDbUsername(cached.username);
      if (cached._updatedAt) setLastUpdated(cached._updatedAt);
    }
    
    getMe().then((data: any) => {
      if (data?.username) {
        setDbUsername(data.username);
        const updatedAt = Date.now();
        const updatedData: ProfileSnapshot = {
          id: data?.id || user?.id,
          clerkId: user?.id,
          fullName: user?.fullName ?? null,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          imageUrl: user?.imageUrl ?? null,
          email: user?.primaryEmailAddress?.emailAddress ?? null,
          username: data?.username,
          _updatedAt: updatedAt,
        };
        cacheSet("profile_me", updatedData);
        setProfileSnapshot(updatedData);
        setLastUpdated(updatedAt);
      }
      setIsOffline(false);
    }).catch(() => {
      setIsOffline(true);
    });
    
    // Also cache Clerk user info for offline 
    if (user) {
      cacheSet("clerk_user", {
        id: user.id,
        clerkId: user.id,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
      });
    }
  }, [user, editModalVisible]); // re-fetch after user changes

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
                  source={profileSnapshot?.imageUrl || user?.imageUrl}
                  style={{ width: 110, height: 110, borderRadius: 32 }}
                  contentFit="cover"
                />
              </View>
              <View className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-success border-4 border-surface-elevated dark:border-surface-elevated-dark shadow-sm" />
            </View>

            <View className="items-center mt-4">
              <Text className="text-2xl font-black text-foreground dark:text-foreground-dark tracking-tight">
                {profileSnapshot?.fullName || user?.fullName || profileSnapshot?.username || user?.username || "User"}
              </Text>
              {dbUsername ? (
                <Text className="text-sm font-bold text-primary mt-0.5">@{dbUsername}</Text>
              ) : null}
              <View className="mt-1 bg-primary/10 px-4 py-1.5 rounded-full flex-row items-center">
                <Ionicons name="mail" size={12} color={COLORS.primary} />
                <Text className="ml-2 text-[11px] font-bold text-primary">
                  {profileSnapshot?.email || user?.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
              {isOffline && (
                <Text className="text-[10px] text-red-500 font-bold mt-2">
                  Offline {lastUpdated ? `(Last updated: ${new Date(lastUpdated).toLocaleDateString()})` : ''}
                </Text>
              )}
            </View>
          </View>

          {/* MENU ITEMS */}
          <View className="px-6 mt-8">
            <Text className="text-[10px] font-black text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-[2px] ml-2 mb-3">ACCOUNT</Text>
            <View className="bg-surface-elevated dark:bg-surface-elevated-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden shadow-sm shadow-black/5">
              <Pressable
                className="flex-row items-center px-6 py-5 active:bg-surface dark:active:bg-surface-dark"
                onPress={() => setFriendsSectionVisible(true)}
              >
                <View className="h-10 w-10 rounded-2xl items-center justify-center bg-primary/15">
                  <Ionicons name="people" size={20} color={COLORS.primary} />
                </View>
                <Text className="flex-1 ml-4 text-[15px] font-bold text-foreground-muted dark:text-foreground-muted-dark">Friends</Text>
                <Ionicons name="chevron-forward" size={16} color={resolvedTheme === "dark" ? "#7A8495" : "#D1D5DB"} />
              </Pressable>
            </View>
          </View>

          <View className="px-6 mt-6">
            <Text className="text-[10px] font-black text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-[2px] ml-2 mb-3">THEME</Text>
            <View className="bg-surface-elevated dark:bg-surface-elevated-dark rounded-2xl border border-border dark:border-border-dark p-4 shadow-sm shadow-black/5">
              <Pressable
                onPress={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="h-10 w-10 rounded-2xl items-center justify-center bg-primary/15">
                    <Ionicons
                      name={resolvedTheme === "dark" ? "moon" : "sunny"}
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-widest">
                      Active
                    </Text>
                    <Text className="text-base font-black text-foreground dark:text-foreground-dark mt-0.5">
                      {resolvedTheme === "dark" ? "Dark" : "Light"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={themeDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={COLORS.textMuted}
                />
              </Pressable>

              {themeDropdownOpen && (
                <View className="mt-4 pt-4 border-t border-border dark:border-border-dark gap-2">
                  {(
                    [
                      { key: "light", label: "Light", icon: "sunny" },
                      { key: "dark", label: "Dark", icon: "moon" },
                    ] as Array<{ key: ThemePreference; label: string; icon: string }>
                  ).map((mode) => {
                    const active = preference === mode.key;
                    return (
                      <Pressable
                        key={mode.key}
                        onPress={() => {
                          setPreference(mode.key);
                          setThemeDropdownOpen(false);
                        }}
                        className={`flex-row items-center gap-3 p-3 rounded-xl ${
                          active
                            ? "bg-primary/10 border border-primary"
                            : "bg-surface dark:bg-surface-dark border border-transparent"
                        }`}
                      >
                        <View
                          className={`h-8 w-8 rounded-lg items-center justify-center ${
                            active
                              ? "bg-primary"
                              : "bg-surface-elevated dark:bg-surface-elevated-dark"
                          }`}
                        >
                          <Ionicons
                            name={mode.icon as any}
                            size={16}
                            color={
                              active ? "#F8FAFC" : COLORS.textMuted
                            }
                          />
                        </View>
                        <Text
                          className={`text-sm font-bold ${
                            active
                              ? "text-foreground dark:text-foreground-dark"
                              : "text-foreground-muted dark:text-foreground-muted-dark"
                          }`}
                        >
                          {mode.label}
                        </Text>
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={COLORS.primary}
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
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
                        router.replace("/(auth)");
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

      {friendsSectionVisible && (
        <View className="absolute inset-0 z-50">
          <FriendsSection
            visible={friendsSectionVisible}
            onClose={() => setFriendsSectionVisible(false)}
          />
        </View>
      )}
    </View>
  );
};

export default ProfileScreen;