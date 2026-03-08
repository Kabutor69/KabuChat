import {
  createDmConversation,
  getFriends,
  getPendingFriendRequests,
  searchUsers,
  sendFriendRequest,
  type UserSearchItem,
} from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
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

type TabType = "search" | "friends";

const ExploreScreen = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [friends, setFriends] = useState<UserSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [startingDmWith, setStartingDmWith] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

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
      Alert.alert("Request sent", `Friend request sent to ${target.username ?? target.clerkId}.`);
    } catch {
      Alert.alert("Request failed", "Could not send friend request.");
    } finally {
      setSendingTo(null);
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
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 pt-3 pb-2 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-foreground">Explore</Text>
          <Text className="mt-1 text-sm text-foreground-muted">
            {activeTab === "search" ? "Search friends and send request" : "Your friends"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(modals)/friend-requests")}
          className="h-11 px-4 rounded-xl bg-primary items-center justify-center flex-row gap-2"
        >
          <Text className="font-bold text-white">Requests</Text>
          {requestCount > 0 && (
            <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
              <Text className="text-white text-xs font-bold">{requestCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="px-4 pb-3 flex-row gap-2">
        <Pressable
          onPress={() => setActiveTab("search")}
          className={`flex-1 h-11 rounded-xl items-center justify-center ${
            activeTab === "search" ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`font-bold ${activeTab === "search" ? "text-white" : "text-gray-700"}`}
          >
            Search
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("friends")}
          className={`flex-1 h-11 rounded-xl items-center justify-center ${
            activeTab === "friends" ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`font-bold ${activeTab === "friends" ? "text-white" : "text-gray-700"}`}
          >
            Friends
          </Text>
        </Pressable>
      </View>

      {/* Search Tab Content */}
      {activeTab === "search" && (
        <>
          <View className="px-4 pb-3 flex-row gap-2">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by username"
              placeholderTextColor="#94A3B8"
              className="flex-1 h-12 rounded-xl border border-border bg-white px-4 text-foreground"
              autoCapitalize="none"
              onSubmitEditing={onSearch}
            />
            <Pressable
              onPress={onSearch}
              className="h-12 rounded-xl bg-primary px-4 items-center justify-center"
            >
              <Text className="font-bold text-white">Search</Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <View className="rounded-2xl border border-border bg-white p-4 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-foreground">
                      {item.username ?? "Unnamed user"}
                    </Text>
                    <Text className="mt-1 text-xs text-foreground-subtle">{item.clerkId}</Text>
                  </View>
                  <Pressable
                    onPress={() => onSendRequest(item)}
                    disabled={sendingTo === item.clerkId}
                    className="h-10 rounded-lg bg-primary px-3 items-center justify-center"
                  >
                    {sendingTo === item.clerkId ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-xs font-bold text-white">Add Friend</Text>
                    )}
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <View className="py-16 items-center">
                  <Text className="text-foreground-muted">
                    {canSearch ? "No users found" : "Type at least 2 characters to search"}
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
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <View className="rounded-2xl border border-border bg-white p-4 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-foreground">
                      {item.username ?? "Unnamed user"}
                    </Text>
                    <Text className="mt-1 text-xs text-foreground-subtle">{item.clerkId}</Text>
                  </View>
                  <Pressable
                    onPress={() => onStartDm(item)}
                    disabled={startingDmWith === item.clerkId}
                    className="h-10 rounded-lg bg-primary px-3 items-center justify-center"
                  >
                    {startingDmWith === item.clerkId ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-xs font-bold text-white">Message</Text>
                    )}
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <View className="py-16 items-center">
                  <Text className="text-foreground-muted">No friends yet</Text>
                  <Text className="text-foreground-muted text-xs mt-1">
                    Search for users and send friend requests
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default ExploreScreen;