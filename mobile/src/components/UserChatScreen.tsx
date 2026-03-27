import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getMessages,
    markConversationAsRead,
    type ChatMessage,
} from "../lib/api";
import { connectSocket, getSocket } from "../lib/socket";

const UserChatScreen: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.log("Failed to mark messages as read", error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    let socket: any = null;

    const setupSocket = async () => {
      try {
        await loadMessages();

        socket = await connectSocket();
        setSocketConnected(true);

        socket.emit("joinRoom", conversationId);

        socket.on("newMessage", (message: ChatMessage) => {
          setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });

          if (message.sender.clerkId !== user?.id) {
            void markRead();
          }
        });

        socket.on(
          "typing",
          (payload: {
            conversationId: string;
            clerkId: string;
            isTyping: boolean;
          }) => {
            if (payload.conversationId !== conversationId) return;
            if (payload.clerkId === user?.id) return;
            setIsPeerTyping(payload.isTyping);
          },
        );

        socket.on(
          "messagesRead",
          (payload: {
            conversationId: string;
            readerClerkId: string;
            messageIds: string[];
          }) => {
            if (payload.conversationId !== conversationId) return;

            setMessages((prev) =>
              prev.map((message) => {
                if (!payload.messageIds.includes(message.id)) {
                  return message;
                }

                const currentReadBy = message.readByClerkIds ?? [];
                if (currentReadBy.includes(payload.readerClerkId)) {
                  return message;
                }

                return {
                  ...message,
                  readByClerkIds: [...currentReadBy, payload.readerClerkId],
                };
              }),
            );
          },
        );

        // Handle reconnection
        socket.on("connect", () => {
          console.log("Socket reconnected, rejoining room");
          setSocketConnected(true);
          socket.emit("joinRoom", conversationId);
        });

        socket.on("disconnect", () => {
          console.log("Socket disconnected");
          setSocketConnected(false);
        });
      } catch (error) {
        console.error("Socket setup failed:", error);
        setSocketConnected(false);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.off("newMessage");
        socket.off("typing");
        socket.off("messagesRead");
        socket.off("connect");
        socket.off("disconnect");
      }
    };
  }, [conversationId, loadMessages, markRead, user?.id]);

  useEffect(() => {
    if (!conversationId) return;
    void markRead();
  }, [conversationId, messages.length, markRead]);

  const handleInputChange = (value: string) => {
    setInput(value);

    const socket = getSocket();
    if (!socket || !socketConnected || !conversationId) return;

    if (value.trim().length === 0) {
      socket.emit("typingStop", conversationId);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      return;
    }

    socket.emit("typingStart", conversationId);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      socket.emit("typingStop", conversationId);
    }, 1200);

    setTypingTimeout(timeout);
  };

  const handleSend = async () => {
    if (!conversationId || !input.trim()) return;

    const content = input.trim();
    setInput("");

    try {
      setSending(true);
      const socket = getSocket();
      if (socket && socketConnected) {
        socket.emit("sendMessage", { conversationId, content });
        socket.emit("typingStop", conversationId);
      } else {
        throw new Error("Socket not connected");
      }
    } catch (error) {
      console.error("Failed to send message", error);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-slate-100 bg-white shadow-sm z-10 w-full mb-2">
            <Pressable 
                onPress={() => router.back()} 
                className="h-10 w-10 rounded-full bg-slate-50 items-center justify-center mr-3"
            >
                <Ionicons name="chevron-back" size={20} color="#64748B" />
            </Pressable>
            <View className="flex-1">
                <Text className="text-xl font-black text-slate-800">Messages</Text>
            </View>
        </View>

        {loading && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const isMe = item.sender.clerkId === user?.id;
            return (
              <View
                className={`max-w-[80%] mb-3 px-4 py-3 ${
                  isMe
                    ? "self-end bg-primary rounded-2xl rounded-tr-sm"
                    : "self-start bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm"
                }`}
              >
                <Text
                  className={isMe ? "text-white font-medium" : "text-slate-800 font-medium"}
                >
                  {item.content}
                </Text>
                {isMe &&
                (item.readByClerkIds?.length ?? 0) > 0 ? (
                  <Text className="text-white/70 mt-1 text-[10px] text-right font-medium tracking-wide text-amber-50">
                    Seen
                  </Text>
                ) : null}
              </View>
            );
          }}
          style={{ flex: 1 }}
        />

        {isPeerTyping ? (
          <View className="px-4 mb-2">
            <Text className="text-xs font-semibold text-slate-400 italic">Typing...</Text>
          </View>
        ) : null}

        <View className="flex-row items-center px-4 py-3 bg-white border-t border-slate-50">
          <View className="flex-1 bg-slate-50 border border-slate-100 rounded-full flex-row items-center px-5 h-12">
            <TextInput
              value={input}
              onChangeText={handleInputChange}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              className="flex-1 font-medium text-slate-700 h-full"
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={sending || !input.trim()}
            className={`ml-3 w-12 h-12 rounded-full items-center justify-center shadow-lg ${
               sending || !input.trim() ? "bg-slate-100 shadow-none border border-slate-100" : "bg-primary shadow-primary/30"
            }`}
          >
            {sending ? (
              <ActivityIndicator color={sending || !input.trim() ? "#94A3B8" : "#FFFFFF"} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={sending || !input.trim() ? "#94A3B8" : "#FFFFFF"} style={{ marginLeft: 3 }} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UserChatScreen;