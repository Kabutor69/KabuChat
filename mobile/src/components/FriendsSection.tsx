import {
  cancelFriendRequest,
  createDmConversation,
  getFriends,
  removeFriend,
  type UserSearchItem,
} from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { useThemePreference } from "@/contexts/theme.context";
import { cacheGet, cacheSet } from "@/lib/cache";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExploreCard } from "./ExploreCard";

interface FriendsSectionProps {
  visible: boolean;
  onClose: () => void;
}

export const FriendsSection: React.FC<FriendsSectionProps> = ({
  visible,
  onClose,
}) => {
  const { resolvedTheme } = useThemePreference();
  const router = useRouter();
  const [friendsQuery, setFriendsQuery] = useState("");
  const [friends, setFriends] = useState<UserSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingFrom, setRemovingFrom] = useState<string | null>(null);
  const [startingDmWith, setStartingDmWith] = useState<string | null>(null);

  const filteredFriends = useMemo(() => {
    if (!friendsQuery.trim()) return friends;
    const lower = friendsQuery.toLowerCase();
    return friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(lower) ||
        f.clerkId.toLowerCase().includes(lower)
    );
  }, [friends, friendsQuery]);

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      const cached = cacheGet<UserSearchItem[]>("profile_friends");
      if (cached) setFriends(cached);

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) return;

      const friendsList = await getFriends();
      setFriends(friendsList);
      cacheSet("profile_friends", friendsList);
    } catch {
      // Silently fail or use cache
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible, loadFriends]);

  const onRemoveFriend = async (target: UserSearchItem) => {
    try {
      setRemovingFrom(target.clerkId);
      await removeFriend(target.clerkId);
      setFriends((prev) => prev.filter((f) => f.id !== target.id));
    } catch {
      Alert.alert("Error", "Could not remove friend.");
    } finally {
      setRemovingFrom(null);
    }
  };

  const onStartDm = async (friend: UserSearchItem) => {
    try {
      setStartingDmWith(friend.clerkId);
      const conversation = await createDmConversation(friend.clerkId);
      onClose();
      router.push(`/chat/${conversation.id}` as any);
    } catch {
      Alert.alert("Error", "Could not start conversation");
    } finally {
      setStartingDmWith(null);
    }
  };

  if (!visible) return null;

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4 z-50">
        <View>
          <Text className="text-3xl font-black text-foreground dark:text-foreground-dark tracking-tighter">
            Friends
          </Text>
          <Text className="mt-1 text-xs font-bold text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-widest">
            YOUR NETWORK
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={20}
          className="w-12 h-12 rounded-2xl bg-surface-elevated dark:bg-surface-elevated-dark items-center justify-center shadow-md border border-border dark:border-border-dark active:scale-95"
        >
          <Ionicons name="close" size={24} color={COLORS.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        {/* Search Box */}
        <View className="px-6 pt-2 pb-4 flex-row gap-3">
          <View className="flex-1 h-14 rounded-[20px] bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark shadow-sm shadow-black/5 flex-row items-center px-4">
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              value={friendsQuery}
              onChangeText={setFriendsQuery}
              placeholder="Search friends..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark font-bold"
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
          {friendsQuery.length > 0 && (
            <Pressable
              onPress={() => setFriendsQuery("")}
              className="h-14 w-14 rounded-[20px] bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark items-center justify-center active:scale-95 shadow-sm"
            >
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Friends List */}
        {loading && friends.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ExploreCard
                user={item}
                onAction={() => onStartDm(item)}
                actionLabel="Message"
                isLoading={startingDmWith === item.clerkId}
                onSecondaryAction={() => onRemoveFriend(item)}
                secondaryActionLabel="Remove"
                secondaryActionVariant="danger"
                isSecondaryLoading={removingFrom === item.clerkId}
              />
            )}
            ListEmptyComponent={
              <View className="py-16 items-center">
                <View className="w-16 h-16 rounded-full bg-surface dark:bg-surface-dark items-center justify-center mb-4">
                  <Ionicons name="people" size={28} color={COLORS.textMuted} />
                </View>
                <Text className="text-foreground-subtle dark:text-foreground-subtle-dark font-bold text-center">
                  No friends yet
                </Text>
                <Text className="text-foreground-subtle dark:text-foreground-subtle-dark text-xs font-bold mt-1 text-center">
                  Search for users and send friend requests
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
