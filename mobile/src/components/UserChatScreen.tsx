import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
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
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      {loading && messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf:
                item.sender.clerkId === user?.id ? "flex-end" : "flex-start",
              maxWidth: "80%",
              marginBottom: 10,
              backgroundColor:
                item.sender.clerkId === user?.id ? "#6366F1" : "#E5E7EB",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
            }}
          >
            <Text
              style={{ color: item.sender.clerkId === user?.id ? "white" : "#111827" }}
            >
              {item.content}
            </Text>
            {item.sender.clerkId === user?.id &&
            (item.readByClerkIds?.length ?? 0) > 0 ? (
              <Text style={{ color: "#E5E7EB", marginTop: 4, fontSize: 11 }}>
                Seen
              </Text>
            ) : null}
          </View>
        )}
        style={{ marginBottom: 16 }}
      />

      {isPeerTyping ? (
        <Text style={{ color: "#6B7280", marginBottom: 8 }}>Typing...</Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={input}
          onChangeText={handleInputChange}
          placeholder="Type a message"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 8,
            borderRadius: 8,
          }}
        />
        <Pressable
          onPress={handleSend}
          disabled={sending}
          style={{
            marginLeft: 8,
            backgroundColor: "#6366F1",
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {sending ? "..." : "Send"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default UserChatScreen;