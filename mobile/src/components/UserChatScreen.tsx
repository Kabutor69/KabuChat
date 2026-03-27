import { useThemePreference } from "@/contexts/theme.context";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getConversations,
  getMessages,
  markConversationAsRead,
  type ChatMessage,
  type Conversation,
} from "../lib/api";
import { connectSocket, getSocket } from "../lib/socket";

const UserChatScreen: React.FC = () => {
  const { user } = useUser();
  const { resolvedTheme } = useThemePreference();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const socketHandlersRef = useRef<any>(null);

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

        const handleNewMessage = (message: ChatMessage) => {
          setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });

          if (message.sender.clerkId !== user?.id) {
            void markRead();
          }
        };

        const handleTyping = (payload: {
            conversationId: string;
            clerkId: string;
            isTyping: boolean;
        }) => {
            if (payload.conversationId !== conversationId) return;
            if (payload.clerkId === user?.id) return;
            setIsPeerTyping(payload.isTyping);
        };

        const handleMessagesRead = (payload: {
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
        };

        const handleConnect = () => {
          console.log("Socket reconnected, rejoining room");
          setSocketConnected(true);
          socket.emit("joinRoom", conversationId);
        };

        const handleDisconnect = () => {
          console.log("Socket disconnected");
          setSocketConnected(false);
        };

        const handleError = (payload: { message: string }) => {
          Alert.alert("Error", payload.message || "Something went wrong.");
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("typing", handleTyping);
        socket.on("messagesRead", handleMessagesRead);
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("error", handleError);
        
        // Save handlers to ref so we can specifically clear them later
        socketHandlersRef.current = {
            newMessage: handleNewMessage,
            typing: handleTyping,
            messagesRead: handleMessagesRead,
            connect: handleConnect,
            disconnect: handleDisconnect,
            error: handleError,
        };
      } catch (error) {
        console.error("Socket setup failed:", error);
        setSocketConnected(false);
      }
    };

    setupSocket();

    return () => {
      const handlers = socketHandlersRef.current;
      if (socket && handlers) {
        if (handlers.newMessage) socket.off("newMessage", handlers.newMessage);
        if (handlers.typing) socket.off("typing", handlers.typing);
        if (handlers.messagesRead) socket.off("messagesRead", handlers.messagesRead);
        if (handlers.connect) socket.off("connect", handlers.connect);
        if (handlers.disconnect) socket.off("disconnect", handlers.disconnect);
        if (handlers.error) socket.off("error", handlers.error);
      }
    };
  }, [conversationId, loadMessages, markRead, user?.id]);

  useEffect(() => {
    if (!conversationId) return;
    const fetchConv = async () => {
      try {
        const convs = await getConversations();
        const current = convs.find(c => c.id === conversationId);
        if (current) setConversation(current);
      } catch (e) {
        console.error("Failed to load conversation details", e);
      }
    };
    void fetchConv();
  }, [conversationId]);

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
    Keyboard.dismiss();
    try {
      setSending(true);
      const socket = getSocket();
      if (socket && socketConnected) {
        socket.emit("sendMessage", { conversationId, content });
        socket.emit("typingStop", conversationId);
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
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

  const lastReadMessageId = useMemo(() => {
    const reversed = [...messages].reverse();
    return reversed.find(m => m.sender.clerkId === user?.id && (m.readByClerkIds?.length ?? 0) > 0)?.id;
  }, [messages, user?.id]);

  const peer = conversation?.members.find(m => m.clerkId !== user?.id);
  const headerName = conversation?.isGroup ? conversation.name : (peer?.name || "Chat");
  const headerAvatar = conversation?.isGroup ? null : peer?.avatar;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border dark:border-border-dark bg-surface-elevated dark:bg-surface-elevated-dark shadow-sm z-10 w-full mb-1">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 active:opacity-70 items-center justify-center mr-1"
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={26} color={isDark ? "#E8ECFF" : "#0A0E18"} />
          </Pressable>
          
          <View className="flex-1 flex-row items-center">
            {headerAvatar ? (
              <Image 
                source={{ uri: headerAvatar }} 
                style={{ width: 36, height: 36, borderRadius: 18 }} 
                contentFit="cover"
              />
            ) : (
              <View className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark items-center justify-center border border-border dark:border-border-dark">
                <Ionicons name="person" size={18} color={isDark ? "#A0A9BD" : "#6B7683"} />
              </View>
            )}
            
            <View className="ml-3 flex-1 flex-col justify-center">
              <Text className="text-lg font-bold text-foreground dark:text-foreground-dark" numberOfLines={1}>{headerName}</Text>
            </View>
          </View>
        </View>

        {loading && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#6366F1" />
          </View>
        ) : null}

        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          inverted={true}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16, paddingTop: 8 }}
          renderItem={({ item }) => {
            const isMe = item.sender.clerkId === user?.id;
            const isLastRead = isMe && item.id === lastReadMessageId;

            return (
              <View
                className={`max-w-[75%] mb-2 px-3.5 py-2.5 ${isMe
                    ? "self-end bg-primary rounded-xl rounded-tr-none shadow-sm"
                    : "self-start bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-xl rounded-tl-none shadow-sm"
                  }`}
              >
                <Text
                  className={isMe ? "text-slate-50 text-[15px] leading-5" : "text-foreground dark:text-foreground-dark text-[15px] leading-5"}
                >
                  {item.content}
                </Text>
                {isLastRead ? (
                  <Text className="text-slate-100/80 mt-1 text-[10px] text-right font-medium tracking-wide">
                    Seen
                  </Text>
                ) : null}
              </View>
            );
          }}
          style={{ flex: 1 }}
        />

        {isPeerTyping ? (
          <View className="px-5 mb-2">
            <Text className="text-xs font-semibold text-foreground-subtle dark:text-foreground-subtle-dark italic">Typing...</Text>
          </View>
        ) : null}

        {conversation && !conversation.isGroup && conversation.isFriend === false ? (
          <View className="px-5 py-4 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark items-center justify-center">
            <Text className="text-foreground-muted dark:text-foreground-muted-dark font-medium text-center leading-5 px-4 mb-2">
              You are no longer friends and cannot reply to this conversation.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-end px-3 py-2.5 bg-surface-elevated dark:bg-surface-elevated-dark border-t border-border dark:border-border-dark">
            <View className="flex-1 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl flex-row items-center px-4 min-h-[44px] max-h-32 mb-1">
              <TextInput
                value={input}
                onChangeText={handleInputChange}
                placeholder="Message..."
                placeholderTextColor="#94A3B8"
                multiline={true}
                className="flex-1 font-medium text-foreground dark:text-foreground-dark text-[15px] py-2.5"
                style={{ textAlignVertical: "center" }}
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={sending || !input.trim()}
              className={`ml-2 w-11 h-11 mb-1 rounded-full items-center justify-center ${sending || !input.trim() ? "bg-surface dark:bg-surface-dark" : "bg-primary active:opacity-80"
                }`}
            >
              {sending ? (
                <ActivityIndicator color={sending || !input.trim() ? "#94A3B8" : "#F8FAFC"} size="small" />
              ) : (
                <Ionicons name="paper-plane" size={20} color={sending || !input.trim() ? "#A1A1AA" : "#F8FAFC"} style={{ marginLeft: 2, marginTop: 1 }} />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UserChatScreen;