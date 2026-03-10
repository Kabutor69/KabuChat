import { useAuth, useUser } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeCard } from "../../components/HomeCard";
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