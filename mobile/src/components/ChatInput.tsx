import React, { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type ChatMessage } from "../lib/api";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  isDark: boolean;
  editingMessage: ChatMessage | null;
  cancelEdit: () => void;
  replyingToMessage: ChatMessage | null;
  cancelReply: () => void;
  inputRef: React.RefObject<TextInput>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onInputChange,
  onSend,
  sending,
  isDark,
  editingMessage,
  cancelEdit,
  replyingToMessage,
  cancelReply,
  inputRef,
}) => {
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);


  const bottomPadding = keyboardOpen ? 0 : insets.bottom;

  return (
    <View style={{ paddingBottom: bottomPadding }}>
      {/* Edit mode */}
      {editingMessage ? (
        <View
          className="flex-row items-center px-4 py-2 border-t border-border dark:border-border-dark"
          style={{
            backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.06)",
          }}
        >
          <Ionicons name="pencil" size={16} color="#6366F1" />
          <View className="flex-1 ml-2">
            <Text className="text-[11px] font-semibold" style={{ color: "#6366F1" }}>
              Editing message
            </Text>
            <Text className="text-[12px] mt-0.5" style={{ color: isDark ? "#94A3B8" : "#64748B" }} numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
          <Pressable onPress={cancelEdit} hitSlop={10} className="ml-2 p-1">
            <Ionicons name="close-circle" size={20} color={isDark ? "#6B7280" : "#9CA3AF"} />
          </Pressable>
        </View>
      ) : null}

      {/* Reply mode */}
      {replyingToMessage ? (
        <View
          className="flex-row items-center px-4 py-2 border-t border-border dark:border-border-dark"
          style={{
            backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.06)",
            borderLeftWidth: 3,
            borderLeftColor: "#6366F1",
          }}
        >
          <Ionicons name="arrow-undo" size={16} color="#6366F1" />
          <View className="flex-1 ml-2">
            <Text className="text-[11px] font-semibold" style={{ color: "#6366F1" }}>
              Replying to {replyingToMessage.sender.username || "User"}
            </Text>
            <Text className="text-[12px] mt-0.5" style={{ color: isDark ? "#94A3B8" : "#64748B" }} numberOfLines={1}>
              {replyingToMessage.content}
            </Text>
          </View>
          <Pressable onPress={cancelReply} hitSlop={10} className="ml-2 p-1">
            <Ionicons name="close-circle" size={20} color={isDark ? "#6B7280" : "#9CA3AF"} />
          </Pressable>
        </View>
      ) : null}

      {/* Input bar */}
      <View className="flex-row items-end px-3 py-2.5 bg-surface-elevated dark:bg-surface-elevated-dark border-t border-border dark:border-border-dark">
        <View className="flex-1 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl flex-row items-center px-4 min-h-[44px] max-h-32 mb-1">
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={onInputChange}
            placeholder={editingMessage ? "Edit message..." : "Message..."}
            placeholderTextColor="#94A3B8"
            multiline={true}
            className="flex-1 font-medium text-foreground dark:text-foreground-dark text-[15px] py-2.5"
            style={{ textAlignVertical: "center" }}
          />
        </View>
        <Pressable
          onPress={onSend}
          disabled={sending || !input.trim()}
          className={`ml-2 w-11 h-11 mb-1 rounded-full items-center justify-center ${
            sending || !input.trim() ? "bg-surface dark:bg-surface-dark" : "bg-primary active:opacity-80"
          }`}
        >
          {sending ? (
            <ActivityIndicator color={sending || !input.trim() ? "#94A3B8" : "#F8FAFC"} size="small" />
          ) : editingMessage ? (
            <Ionicons name="checkmark" size={22} color={sending || !input.trim() ? "#A1A1AA" : "#F8FAFC"} />
          ) : (
            <Ionicons name="paper-plane" size={20} color={sending || !input.trim() ? "#A1A1AA" : "#F8FAFC"} style={{ marginLeft: 2, marginTop: 1 }} />
          )}
        </Pressable>
      </View>
    </View>
  );
};