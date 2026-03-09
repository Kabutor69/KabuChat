import { useAuth, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getConversations, type Conversation } from "../../lib/api";

const ChatScreen: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    if (!isSignedIn) {
      console.log("Not signed in, skipping fetch");
      return;
    }
    
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchConversations();
    }
  }, [isLoaded, isSignedIn]);

  const renderItem = ({ item }: { item: Conversation }) => {
    // Find the other user in the conversation (not the current user)
    const otherUser = item.members.find(member => member.clerkId !== user?.id) || item.members[0];

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}` as any)}
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
          {otherUser?.name ?? "Unknown user"}
        </Text>
        <Text numberOfLines={1} style={{ color: "#666" }}>
          {item.lastMessage ? item.lastMessage.content : "No messages yet"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ fontSize: 30, fontWeight: "800" }}>Chats</Text>
      </View>
      {loading && conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchConversations} />}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text>No chats yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ChatScreen;