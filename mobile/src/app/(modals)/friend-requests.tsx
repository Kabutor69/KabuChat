import {
    acceptFriendRequest,
    getPendingFriendRequests,
    rejectFriendRequest,
    type FriendRequest,
} from "@/lib/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FriendRequestsScreen = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPendingFriendRequests();
      setRequests(data);
    } catch {
      Alert.alert("Error", "Could not load friend requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onAccept = async (request: FriendRequest) => {
    try {
      setProcessingId(request.id);
      await acceptFriendRequest(request.id);
      Alert.alert("Success", `You are now friends with ${request.sender.username ?? "this user"}`);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      Alert.alert("Error", "Could not accept friend request");
    } finally {
      setProcessingId(null);
    }
  };

  const onReject = async (request: FriendRequest) => {
    try {
      setProcessingId(request.id);
      await rejectFriendRequest(request.id);
      Alert.alert("Rejected", "Friend request rejected");
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      Alert.alert("Error", "Could not reject friend request");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 pt-3 pb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-foreground">Friend Requests</Text>
          <Text className="mt-1 text-sm text-foreground-muted">
            {requests.length} pending {requests.length === 1 ? "request" : "requests"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center"
        >
          <Text className="text-lg">✕</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const isProcessing = processingId === item.id;
            return (
              <View className="rounded-2xl border border-border bg-white p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mr-3">
                    <Text className="text-white text-xl font-bold">
                      {(item.sender.username ?? "U")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">
                      {item.sender.username ?? "Unknown user"}
                    </Text>
                    <Text className="text-xs text-foreground-subtle mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => onAccept(item)}
                    disabled={isProcessing}
                    className="flex-1 h-11 rounded-xl bg-primary items-center justify-center"
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-bold text-white">Accept</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => onReject(item)}
                    disabled={isProcessing}
                    className="flex-1 h-11 rounded-xl bg-gray-200 items-center justify-center"
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#666" />
                    ) : (
                      <Text className="font-bold text-gray-700">Reject</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-foreground-muted text-center">
                No pending friend requests
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default FriendRequestsScreen;
