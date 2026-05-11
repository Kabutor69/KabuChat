import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type ChatMessage } from "../lib/api";

interface MessageBubbleProps {
  item: ChatMessage;
  isMe: boolean;
  isDark: boolean;
  isLastRead: boolean;
  onLongPress: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  isMe,
  isDark,
  isLastRead,
  onLongPress,
}) => {
  if (item.isDeleted) {
    return (
      <View
        className={`max-w-[75%] mb-2 px-3.5 py-2.5 ${
          isMe ? "self-end rounded-xl rounded-tr-none" : "self-start rounded-xl rounded-tl-none"
        }`}
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          borderStyle: "dashed",
        }}
      >
        <View className="flex-row items-center">
          <Ionicons
            name="ban-outline"
            size={13}
            color={isDark ? "#6B7280" : "#9CA3AF"}
            style={{ marginRight: 5 }}
          />
          <Text
            className="text-[13px] leading-5"
            style={{
              fontStyle: "italic",
              color: isDark ? "#6B7280" : "#9CA3AF",
            }}
          >
            This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onLongPress={() => onLongPress(item)}
      delayLongPress={400}
      className={`max-w-[75%] mb-2 ${isMe ? "self-end" : "self-start"}`}
    >
      {item.replyTo ? (
        <View
          className={`px-3 py-1.5 mb-0.5 rounded-t-lg ${isMe ? "rounded-tr-none" : "rounded-tl-none"}`}
          style={{
            backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
            borderLeftWidth: 3,
            borderLeftColor: "#6366F1",
          }}
        >
          <Text className="text-[11px] font-semibold mb-0.5" style={{ color: "#6366F1" }} numberOfLines={1}>
            {item.replyTo.sender.username || "User"}
          </Text>
          <Text
            className="text-[12px]"
            style={{
              color: isDark ? "#94A3B8" : "#64748B",
              fontStyle: item.replyTo.isDeleted ? "italic" : "normal",
            }}
            numberOfLines={2}
          >
            {item.replyTo.isDeleted ? "This message was deleted" : item.replyTo.content}
          </Text>
        </View>
      ) : null}

      <View
        className={`px-3.5 py-2.5 ${
          isMe
            ? "bg-primary rounded-xl rounded-tr-none shadow-sm"
            : "bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-xl rounded-tl-none shadow-sm"
        } ${item.replyTo ? "rounded-t-lg" : ""}`}
      >
        <Text className={isMe ? "text-slate-50 text-[15px] leading-5" : "text-foreground dark:text-foreground-dark text-[15px] leading-5"}>
          {item.content}
        </Text>
        <View className="flex-row items-center justify-end mt-0.5">
          {item.isEdited ? (
            <Text
              className="text-[10px] mr-1"
              style={{
                color: isMe ? "rgba(248, 250, 252, 0.6)" : isDark ? "#6B7280" : "#9CA3AF",
                fontStyle: "italic",
              }}
            >
              edited
            </Text>
          ) : null}
          {isLastRead ? (
            <Text className="text-slate-100/80 text-[10px] font-medium tracking-wide">Seen</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};
