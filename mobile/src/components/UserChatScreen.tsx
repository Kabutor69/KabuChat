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
import { getMessages, type ChatMessage } from "../lib/api";
import { connectSocket, getSocket } from "../lib/socket";

const UserChatScreen: React.FC = () => {
  const { user } = useUser();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

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

  useEffect(() => {
    if (!conversationId) return;

    let socket: any = null;

    const setupSocket = async () => {
      try {
        // Load initial messages
        await loadMessages();

        // Connect to Socket.io
        socket = await connectSocket();
        setSocketConnected(true);

        // Join conversation room
        socket.emit("joinRoom", conversationId);

        // Listen for new messages
        socket.on("newMessage", (message: ChatMessage) => {
          console.log("New message received:", message);
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
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
      }
    };
  }, [conversationId, loadMessages]);

  const handleSend = async () => {
    if (!conversationId || !input.trim()) return;

    const content = input.trim();
    setInput("");

    try {
      setSending(true);
      const socket = getSocket();
      if (socket && socketConnected) {
        // Send via Socket.io
        socket.emit("sendMessage", { conversationId, content });
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
          </View>
        )}
        style={{ marginBottom: 16 }}
      />

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={input}
          onChangeText={setInput}
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