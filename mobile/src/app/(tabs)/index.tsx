import { useThemePreference } from "@/contexts/theme.context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { HomeCard } from "../../components/HomeCard";
import { getConversations, type ChatMessage, type Conversation } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import { cacheGet, cacheSet } from "../../lib/cache";

const ChatScreen: React.FC = () => {
  const { resolvedTheme } = useThemePreference();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const currentUserId = user?.id ?? cacheGet<{ id?: string }>("profile_me")?.id;

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const lower = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const otherMember = conv.members.find((m) => m.clerkId !== currentUserId);
      return (
        otherMember?.name?.toLowerCase().includes(lower) ||
        otherMember?.clerkId?.toLowerCase().includes(lower)
      );
    });
  }, [conversations, searchQuery, currentUserId]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const cached = cacheGet<Conversation[]>("conversations");
      if (cached) {
        setConversations(cached);
      }
      const data = await getConversations();
      
      // Add cached member data
      const cachedMembers = cacheGet<Record<string, any>>("members") || {};
      const enrichedData = data.map(conv => ({
        ...conv,
        members: conv.members.map(member => ({
          ...member,
          // Use cached profile if available
          avatar: member.avatar || cachedMembers[member.clerkId]?.avatar,
          name: member.name || cachedMembers[member.clerkId]?.name || member.clerkId,
        })),
      }));
      
      // Update members cache for offline use
      const memberMap: Record<string, any> = { ...cachedMembers };
      enrichedData.forEach(conv => {
        conv.members.forEach(member => {
          memberMap[member.clerkId] = member;
        });
      });
      cacheSet("members", memberMap);
      
      const sorted = enrichedData.sort((a,b) => {
          const tA = a.activeAt ? new Date(a.activeAt).getTime() : (a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0);
          const tB = b.activeAt ? new Date(b.activeAt).getTime() : (b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0);
          return tB - tA;
      });
      setConversations(sorted);
      cacheSet("conversations", sorted);
      return sorted;
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      const cached = cacheGet<Conversation[]>("conversations");
      if (cached) {
        // Add cached member info
        const cachedMembers = cacheGet<Record<string, any>>("members") || {};
        const enriched = cached.map(conv => ({
          ...conv,
          members: conv.members.map(member => ({
            ...member,
            avatar: member.avatar || cachedMembers[member.clerkId]?.avatar,
            name: member.name || cachedMembers[member.clerkId]?.name || member.clerkId,
          })),
        }));
        setConversations(enriched);
        return enriched;
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();

    if (!isLoaded || !isSignedIn) return;

    let socket: any = null;

    const setupChatUpdates = async () => {
      const initialConvs = await fetchConversations();

      try {
        socket = await connectSocket();
        if (socket) {
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
              
              const sorted = updated.sort((a,b) => {
                  const tA = a.activeAt ? new Date(a.activeAt).getTime() : (a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0);
                  const tB = b.activeAt ? new Date(b.activeAt).getTime() : (b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0);
                  return tB - tA;
              });
              cacheSet("conversations", sorted);
              return sorted;
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
              cacheSet("conversations", updated);
              return updated;
            });
          });
        }
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
      currentUserId={currentUserId}
      onPress={() => {
        setSearchQuery("");
        router.push(`/chat/${item.id}` as any);
      }}
    />
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-2 pb-4 z-50">
          <Text className="text-3xl font-black text-foreground dark:text-foreground-dark tracking-tighter">Chats</Text>
        </View>

        {/* Search Bar */}
        <View className="px-6 pb-4 flex-row gap-3">
          <View className="flex-1 h-14 rounded-[20px] bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark shadow-sm shadow-black/5 flex-row items-center px-4">
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search chats..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark font-bold"
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              className="h-14 w-14 rounded-[20px] bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark items-center justify-center active:scale-95 shadow-sm"
            >
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>

        {loading && conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : null}

        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchConversations} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center">
              {searchQuery.trim() ? (
                <>
                  <View className="w-16 h-16 rounded-full bg-surface dark:bg-surface-dark items-center justify-center mb-4">
                    <Ionicons name="search" size={28} color={COLORS.textMuted} />
                  </View>
                  <Text className="text-foreground-subtle dark:text-foreground-subtle-dark font-bold">No chats found</Text>
                  <Text className="text-foreground-subtle dark:text-foreground-subtle-dark text-xs font-bold mt-1 text-center">Try searching for a different name or username</Text>
                </>
              ) : (
                <Text className="text-foreground-subtle dark:text-foreground-subtle-dark font-bold">No chats yet</Text>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default ChatScreen;