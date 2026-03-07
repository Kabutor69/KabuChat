import { searchUsers, sendFriendRequest, type UserSearchItem } from "@/lib/api";
import { useMemo, useState } from "react";
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

const ExploreScreen = () => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-3xl font-extrabold text-foreground">Explore</Text>
        <Text className="mt-1 text-sm text-foreground-muted">Search friends and send request</Text>
      </View>

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
    </SafeAreaView>
  );
};

export default ExploreScreen;