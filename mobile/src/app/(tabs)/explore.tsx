import {
  cancelFriendRequest,
  createDmConversation,
  getFriends,
  getPendingFriendRequests,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type UserSearchItem,
} from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExploreCard } from "../../components/ExploreCard";

type TabType = "search" | "friends";

const ExploreScreen = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [query, setQuery] = useState("");
  const [friendsQuery, setFriendsQuery] = useState("");
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [friends, setFriends] = useState<UserSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [cancelingFrom, setCancelingFrom] = useState<string | null>(null);
  const [removingFrom, setRemovingFrom] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [startingDmWith, setStartingDmWith] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  const filteredFriends = useMemo(() => {
    if (!friendsQuery.trim()) return friends;
    const lower = friendsQuery.toLowerCase();
    return friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(lower) ||
        f.clerkId.toLowerCase().includes(lower),
    );
  }, [friends, friendsQuery]);

  const loadRequestCount = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const requests = await getPendingFriendRequests();
      setRequestCount(requests.length);
    } catch {
      // Silently fail
    }
  }, [isSignedIn]);

  const loadFriends = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      setLoading(true);
      const friendsList = await getFriends();
      setFriends(friendsList);
    } catch {
      Alert.alert("Error", "Could not load friends");
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadRequestCount();
      const interval = setInterval(loadRequestCount, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoaded, isSignedIn, loadRequestCount]);

  useEffect(() => {
    if (activeTab === "friends") {
      loadFriends();
    }
  }, [activeTab, loadFriends]);

  const onSearch = async () => {
    if (!canSearch) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const result = await searchUsers(query);
      setUsers(result);
    } catch {
      Alert.alert("Search failed", "Could not fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSendRequest = async (target: UserSearchItem) => {
    try {
      setSendingTo(target.clerkId);
      await sendFriendRequest(target.clerkId);
      Alert.alert(
        "Request sent",
        `Friend request sent to ${target.username ?? target.clerkId}.`,
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, relationshipStatus: "pending" } : u,
        ),
      );
    } catch {
      Alert.alert("Request failed", "Could not send friend request.");
    } finally {
      setSendingTo(null);
    }
  };

  const onCancelRequest = async (target: UserSearchItem) => {
    try {
      setCancelingFrom(target.clerkId);
      await cancelFriendRequest(target.clerkId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, relationshipStatus: "none" } : u,
        ),
      );
    } catch {
      Alert.alert("Error", "Could not cancel request.");
    } finally {
      setCancelingFrom(null);
    }
  };

  const onRemoveFriend = async (target: UserSearchItem) => {
    try {
      setRemovingFrom(target.clerkId);
      await removeFriend(target.clerkId);
      setFriends((prev) => prev.filter((f) => f.id !== target.id));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, relationshipStatus: "none" } : u,
        ),
      );
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
      router.push(`/chat/${conversation.id}` as any);
    } catch {
      Alert.alert("Error", "Could not start conversation");
    } finally {
      setStartingDmWith(null);
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Background Gradient */}
      <View className="absolute inset-0 z-0">
        <LinearGradient
          colors={["#FFFFFF", "#F8F9FA", "#F1F3F5"]}
          style={{ flex: 1 }}
        />
      </View>

      <SafeAreaView className="flex-1 z-10" edges={["top"]}>
        <View className="px-6 pt-2 pb-4 flex-row items-center justify-between z-50">
          <View>
            <Text className="text-3xl font-black text-foreground tracking-tighter">
              Explore
            </Text>
            <Text className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
              {activeTab === "search" ? "FIND USERS" : "YOUR NETWORK"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(modals)/friend-requests")}
            hitSlop={10}
            className="h-12 px-5 rounded-2xl bg-white items-center justify-center flex-row gap-2 shadow-sm border border-slate-100 active:scale-95"
          >
            <Ionicons name="notifications" size={18} color={COLORS.primary} />
            {requestCount > 0 && (
              <View className="absolute -top-2 -right-2 bg-red-500 rounded-lg min-w-[20px] h-5 items-center justify-center px-1 shadow-sm border-2 border-white">
                <Text className="text-white text-[10px] font-black">
                  {requestCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Tabs */}
        <View className="px-6 pb-4 pt-2 flex-row gap-3">
          <Pressable
            onPress={() => setActiveTab("search")}
            className={`flex-1 h-12 rounded-[20px] items-center justify-center shadow-sm ${
              activeTab === "search"
                ? "bg-primary shadow-primary/20"
                : "bg-white border border-slate-100 shadow-black/5"
            }`}
          >
            <Text
              className={`text-sm font-black tracking-wide ${activeTab === "search" ? "text-white" : "text-slate-500"}`}
            >
              Search
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("friends")}
            className={`flex-1 h-12 rounded-[20px] items-center justify-center shadow-sm ${
              activeTab === "friends"
                ? "bg-primary shadow-primary/20"
                : "bg-white border border-slate-100 shadow-black/5"
            }`}
          >
            <Text
              className={`text-sm font-black tracking-wide ${activeTab === "friends" ? "text-white" : "text-slate-500"}`}
            >
              Friends
            </Text>
          </Pressable>
        </View>

        {/* Search Tab Content */}
        {activeTab === "search" && (
          <>
            <View className="px-6 pb-4 flex-row gap-3">
              <View className="flex-1 h-14 rounded-[20px] bg-white border border-slate-100 shadow-sm shadow-black/5 flex-row items-center px-4">
                <Ionicons name="search" size={20} color={COLORS.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search usernames..."
                  placeholderTextColor="#94A3B8"
                  className="flex-1 ml-3 h-full text-foreground font-bold"
                  autoCapitalize="none"
                  onSubmitEditing={onSearch}
                  returnKeyType="search"
                />
              </View>
              <Pressable
                onPress={onSearch}
                className="h-14 w-14 rounded-[20px] bg-primary items-center justify-center shadow-sm shadow-primary/20 active:scale-95"
              >
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingBottom: 20,
                }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  if (item.relationshipStatus === "friends") {
                    return (
                      <ExploreCard
                        user={item}
                        onAction={() => onStartDm(item)}
                        actionLabel="Message"
                        isLoading={startingDmWith === item.clerkId}
                        onSecondaryAction={() => onRemoveFriend(item)}
                        secondaryActionLabel="Remove Friend"
                        secondaryActionVariant="secondary"
                        isSecondaryLoading={removingFrom === item.clerkId}
                      />
                    );
                  }
                  if (item.relationshipStatus === "pending") {
                    return (
                      <ExploreCard
                        user={item}
                        onAction={() => onCancelRequest(item)}
                        actionLabel="Cancel Request"
                        actionVariant="secondary"
                        isLoading={cancelingFrom === item.clerkId}
                      />
                    );
                  }
                  return (
                    <ExploreCard
                      user={item}
                      onAction={() => onSendRequest(item)}
                      actionLabel="Add Friend"
                      isLoading={sendingTo === item.clerkId}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View className="py-16 items-center">
                    <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                      <Ionicons
                        name="search"
                        size={28}
                        color={COLORS.textMuted}
                      />
                    </View>
                    <Text className="text-slate-400 font-bold text-center">
                      {canSearch
                        ? "No users found"
                        : "Type at least 2 characters to search"}
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* Friends Tab Content */}
        {activeTab === "friends" && (
          <>
            <View className="px-6 pb-4 flex-row gap-3">
              <View className="flex-1 h-14 rounded-[20px] bg-white border border-slate-100 shadow-sm shadow-black/5 flex-row items-center px-4">
                <Ionicons name="search" size={20} color={COLORS.textMuted} />
                <TextInput
                  value={friendsQuery}
                  onChangeText={setFriendsQuery}
                  placeholder="Search friends..."
                  placeholderTextColor="#94A3B8"
                  className="flex-1 ml-3 h-full text-foreground font-bold"
                  autoCapitalize="none"
                  returnKeyType="search"
                />
              </View>
            </View>

            {loading ? (
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
                    <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                      <Ionicons
                        name="people"
                        size={28}
                        color={COLORS.textMuted}
                      />
                    </View>
                    <Text className="text-slate-400 font-bold text-center">
                      No friends yet
                    </Text>
                    <Text className="text-slate-400 text-xs font-bold mt-1 text-center">
                      Search for users and send friend requests
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
};

export default ExploreScreen;

