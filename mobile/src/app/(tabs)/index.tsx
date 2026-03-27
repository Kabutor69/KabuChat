import { useAuth, useUser } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeCard } from "../../components/HomeCard";
import { getConversations, type Conversation, type ChatMessage } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

const ChatScreen: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!isSignedIn) {
      console.log("Not signed in, skipping fetch");
      return [];
    }

    try {
      setLoading(true);
      const data = await getConversations();
      const sorted = data.sort((a,b) => {
          const tA = a.activeAt ? new Date(a.activeAt).getTime() : (a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0);
          const tB = b.activeAt ? new Date(b.activeAt).getTime() : (b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0);
          return tB - tA;
      });
      setConversations(sorted);
      return sorted;
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let socket: any = null;

    const setupChatUpdates = async () => {
      const initialConvs = await fetchConversations();

      try {
        socket = await connectSocket();
        
        initialConvs.forEach((c: Conversation) => socket.emit("joinRoom", c.id));

        socket.on("newMessage", (message: ChatMessage & { conversationId: string }) => {
          setConversations(prev => {
            const index = prev.findIndex(c => c.id === message.conversationId);
            if (index === -1) {
              void fetchConversations();
              return prev;
            }
            
            const updated = [...prev];
            updated[index] = { 
              ...updated[index],
              activeAt: message.createdAt,
              lastMessage: { 
                content: message.content, 
                createdAt: message.createdAt,
                sender: { clerkId: message.sender.clerkId },
                readByClerkIds: message.readByClerkIds || [] 
              } 
            };
            
            return updated.sort((a,b) => {
                const tA = a.activeAt ? new Date(a.activeAt).getTime() : (a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0);
                const tB = b.activeAt ? new Date(b.activeAt).getTime() : (b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0);
                return tB - tA;
            });
          });
        });

        socket.on("messagesRead", (payload: { conversationId: string; readerClerkId: string; messageIds: string[] }) => {
          setConversations(prev => {
            const index = prev.findIndex(c => c.id === payload.conversationId);
            if (index === -1) return prev;
            
            const conv = prev[index];
            if (!conv.lastMessage) return prev;
            
            if (conv.lastMessage.readByClerkIds?.includes(payload.readerClerkId)) return prev;

            const updated = [...prev];
            updated[index] = {
              ...conv,
              lastMessage: {
                ...conv.lastMessage,
                readByClerkIds: [...(conv.lastMessage.readByClerkIds || []), payload.readerClerkId]
              }
            };
            return updated;
          });
        });

      } catch (e) {
        console.error("Home socket setup failed", e);
      }
    };

    setupChatUpdates();

    return () => {
      if (socket) {
        socket.off("newMessage");
        socket.off("messagesRead");
      }
    };
  }, [isLoaded, isSignedIn, fetchConversations]);

  const renderItem = ({ item }: { item: Conversation }) => (
    <HomeCard
      conversation={item}
      currentUserId={user?.id}
      onPress={() => router.push(`/chat/${item.id}` as any)}
    />
  );

  return (
    <View className="flex-1 bg-background">
      {/* Background Gradient */}
      <View className="absolute inset-0 z-0">
        <LinearGradient colors={["#FFFFFF", "#F8F9FA", "#F1F3F5"]} style={{ flex: 1 }} />
      </View>

      <SafeAreaView className="flex-1 z-10" edges={['top']}>
        {/* Header */}
        <View className="px-6 pt-2 pb-4 z-50">
          <Text className="text-3xl font-black text-foreground tracking-tighter">Chats</Text>
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
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-slate-400 font-bold">No chats yet</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default ChatScreen;