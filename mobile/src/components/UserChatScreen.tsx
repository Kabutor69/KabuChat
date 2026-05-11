import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View, ActivityIndicator } from "react-native";
import { useThemePreference } from "@/contexts/theme.context";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { SafeAreaView } from "react-native-safe-area-context";

import { getConversations, type ChatMessage, type Conversation } from "../lib/api";
import { getSocket } from "../lib/socket";

import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useChatSocket } from "../hooks/useChatSocket";
import { useMessageActions } from "../hooks/useMessageActions";

const UserChatScreen: React.FC = () => {
  const { user } = useUser();
  const { resolvedTheme } = useThemePreference();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const headerHeight = useHeaderHeight();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  const { messages, loading, socketConnected, isPeerTyping, markRead } = useChatSocket(conversationId, user?.id);

  const { handleLongPress } = useMessageActions(
    user?.id,
    socketConnected,
    setEditingMessage,
    setReplyingToMessage,
    setInput,
    inputRef
  );

  useEffect(() => {
    if (!conversationId) return;
    const fetchConv = async () => {
      try {
        const convs = await getConversations();
        const current = convs.find((c) => c.id === conversationId);
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
    if (typingTimeout) clearTimeout(typingTimeout);
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
        if (editingMessage) {
          socket.emit("editMessage", { messageId: editingMessage.id, content });
          setEditingMessage(null);
        } else {
          socket.emit("sendMessage", {
            conversationId,
            content,
            ...(replyingToMessage ? { replyToId: replyingToMessage.id } : {}),
          });
          setReplyingToMessage(null);
        }
        socket.emit("typingStop", conversationId);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
    return reversed.find((m) => m.sender.clerkId === user?.id && (m.readByClerkIds?.length ?? 0) > 0)?.id;
  }, [messages, user?.id]);

  const peer = conversation?.members.find((m) => m.clerkId !== user?.id);
  const headerName = conversation?.isGroup ? conversation.name : peer?.name || "Chat";
  const headerAvatar = conversation?.isGroup ? null : peer?.avatar;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-border dark:border-border-dark bg-surface-elevated dark:bg-surface-elevated-dark shadow-sm z-10 w-full mb-1">
        <Pressable onPress={() => router.back()} className="h-10 w-10 active:opacity-70 items-center justify-center mr-1" hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={isDark ? "#E8ECFF" : "#0A0E18"} />
        </Pressable>
        <View className="flex-1 flex-row items-center">
          {headerAvatar ? (
            <Image source={{ uri: headerAvatar }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
          ) : (
            <View className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark items-center justify-center border border-border dark:border-border-dark">
              <Ionicons name="person" size={18} color={isDark ? "#A0A9BD" : "#6B7683"} />
            </View>
          )}
          <View className="ml-3 flex-1 flex-col justify-center">
            <Text className="text-lg font-bold text-foreground dark:text-foreground-dark" numberOfLines={1}>
              {headerName}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : headerHeight + 30} className="flex-1">
        {loading && messages.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#6366F1" />
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          inverted={true}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16, paddingTop: 8 }}
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              isMe={item.sender.clerkId === user?.id}
              isDark={isDark}
              isLastRead={item.sender.clerkId === user?.id && item.id === lastReadMessageId}
              onLongPress={handleLongPress}
            />
          )}
          style={{ flex: 1 }}
        />

        {isPeerTyping && (
          <View className="px-5 mb-2">
            <Text className="text-xs font-semibold text-foreground-subtle dark:text-foreground-subtle-dark italic">Typing...</Text>
          </View>
        )}

        {conversation && !conversation.isGroup && conversation.isFriend === false ? (
          <View className="px-5 py-4 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark items-center justify-center">
            <Text className="text-foreground-muted dark:text-foreground-muted-dark font-medium text-center leading-5 px-4 mb-2">
              You are no longer friends and cannot reply to this conversation.
            </Text>
          </View>
        ) : (
          <ChatInput
            input={input}
            setInput={setInput}
            onInputChange={handleInputChange}
            onSend={handleSend}
            sending={sending}
            isDark={isDark}
            editingMessage={editingMessage}
            cancelEdit={() => {
              setEditingMessage(null);
              setInput("");
            }}
            replyingToMessage={replyingToMessage}
            cancelReply={() => setReplyingToMessage(null)}
            inputRef={inputRef}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UserChatScreen;