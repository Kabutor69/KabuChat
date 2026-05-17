import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View, ActivityIndicator } from "react-native";
import { useThemePreference } from "@/contexts/theme.context";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getConversations, type ChatMessage, type Conversation } from "../lib/api";
import { getSocket } from "../lib/socket";
import { outboxAdd } from "../lib/cache";

import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useChatSocket } from "../hooks/useChatSocket";
import { useMessageActions } from "../hooks/useMessageActions";
import { MessageMenu } from "./MessageMenu";

const UserChatScreen: React.FC = () => {
  const { user } = useUser();
  const { resolvedTheme } = useThemePreference();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === "ios") return;

    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const { messages, setMessages, loading, socketConnected, isPeerTyping, markRead } = useChatSocket(conversationId, user?.id);

  const {
    handleLongPress,
    menuVisible,
    selectedMessage,
    menuPosition,
    closeMenu,
    handleAction,
  } = useMessageActions(
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

      const replyToObj = replyingToMessage ? {
        id: replyingToMessage.id,
        content: replyingToMessage.content,
        sender: { clerkId: replyingToMessage.sender.clerkId }
      } : null;

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
      } else {
        if (editingMessage) {
          // Editing while offline not supported 
          setEditingMessage(null);
        } else {
          const optimisticId = `outbox_${Date.now()}`;
          outboxAdd(optimisticId, conversationId, content, replyingToMessage?.id);

          if (user) {
            setMessages(prev => [...prev, {
              id: optimisticId,
              content,
              createdAt: new Date().toISOString(),
              sender: { id: user.id, clerkId: user.id, username: user.username },
              replyTo: replyToObj as any
            }]);
          }
          setReplyingToMessage(null);
        }
      }
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.error("Failed to send message", error);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const messagesReversed = useMemo(() => [...messages].reverse(), [messages]);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isToday = (d: Date) => isSameDay(d, new Date());

  const formatMessageDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr}${ampm}`;
  };

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const handleReplyPress = (replyToId: string) => {
    const index = messagesReversed.findIndex((m) => m.id === replyToId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(replyToId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const lastReadMessageId = useMemo(() => {
    return messagesReversed.find((m) => m.sender.clerkId === user?.id && (m.readByClerkIds?.length ?? 0) > 0)?.id;
  }, [messagesReversed, user?.id]);

  const peer = conversation?.members.find((m) => m.clerkId !== user?.id);
  const headerName = conversation?.isGroup ? conversation.name : peer?.name || "Chat";
  const headerAvatar = conversation?.isGroup ? null : peer?.avatar;

  return (
    <View className="flex-1">
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

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
          className="flex-1"
          style={Platform.OS === "android" ? { paddingBottom: androidKeyboardHeight } : undefined}
        >
          {loading && messages.length === 0 && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#6366F1" />
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={messagesReversed}
            inverted={true}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16, paddingTop: 8 }}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            }}
            renderItem={({ item, index }) => {
              const olderItem = messagesReversed[index + 1];
              const newerItem = messagesReversed[index - 1];

              const current = new Date(item.createdAt);
              let headerText = null;

              if (!olderItem || !isSameDay(current, new Date(olderItem.createdAt))) {
                headerText = formatMessageDate(item.createdAt);
              } else if (isToday(current)) {
                const olderDate = new Date(olderItem.createdAt);
                const diffMins = (current.getTime() - olderDate.getTime()) / 60000;
                if (diffMins > 30) {
                  headerText = formatMessageTime(item.createdAt);
                }
              }

              const marginBottom = newerItem && item.sender.clerkId === newerItem.sender.clerkId ? 1 : 8;

              return (
                <View style={{ marginBottom }}>
                  {headerText && (
                    <View className="items-center my-4">
                      <View className="bg-surface-elevated dark:bg-surface-elevated-dark px-3 py-1 rounded-full border border-border dark:border-border-dark shadow-sm">
                        <Text className="text-[11px] font-semibold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider">
                          {headerText}
                        </Text>
                      </View>
                    </View>
                  )}
                  <MessageBubble
                    item={item}
                    isMe={item.sender.clerkId === user?.id}
                    isDark={isDark}
                    isLastRead={item.sender.clerkId === user?.id && item.id === lastReadMessageId}
                    onLongPress={handleLongPress}
                    onReplyPress={handleReplyPress}
                    isHighlighted={highlightedMessageId === item.id}
                    onSwipeToReply={setReplyingToMessage}
                  />
                </View>
              );
            }}
            style={{ flex: 1 }}
          />

          {isPeerTyping && (
            <View className="px-5 mb-2">
              <Text className="text-xs font-semibold text-foreground-subtle dark:text-foreground-subtle-dark italic">Typing...</Text>
            </View>
          )}

          {conversation && !conversation.isGroup && conversation.isFriend === false ? (
            <View
              className="px-5 pt-4 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark items-center justify-center"
              style={{ paddingBottom: Math.max(16, insets.bottom) }}
            >
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

      <MessageMenu
        isVisible={menuVisible}
        onClose={closeMenu}
        onAction={handleAction}
        position={menuPosition}
        isMe={selectedMessage?.sender.clerkId === user?.id}
        isDark={isDark}
        message={selectedMessage}
      />
    </View>
  );
};



export default UserChatScreen;