import React from "react";
import { Pressable, Text, View, Dimensions } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { type ChatMessage } from "../lib/api";

interface MessageMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onAction: (action: "Reply" | "Edit" | "Delete") => void;
  position: { x: number; y: number; width: number; height: number } | null;
  isMe: boolean;
  isDark: boolean;
  message: ChatMessage | null;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export const MessageMenu: React.FC<MessageMenuProps> = ({
  isVisible,
  onClose,
  onAction,
  position,
  isMe,
  isDark,
  message,
}) => {
  if (!isVisible || !position || !message) return null;

  const menuWidth = 180;
  const showAbove = position.y > SCREEN_HEIGHT * 0.6;
  
  const menuHeight = 35 + (isMe ? 144 : 48);

  const menuY = showAbove 
    ? position.y - menuHeight - 12 
    : position.y + position.height + 12;

  let menuX = isMe 
    ? position.x + position.width - menuWidth 
    : position.x;

  menuX = Math.max(16, Math.min(menuX, SCREEN_WIDTH - menuWidth - 16));

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      day: "numeric", 
      month: "short", 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    }).toUpperCase();
  };

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Pressable className="absolute inset-0" onPress={onClose}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)}
          className="absolute inset-0 bg-black/35"
        />
      </Pressable>

      <Animated.View
        entering={ZoomIn.duration(200)}
        exiting={ZoomOut.duration(150)}
        className={`absolute z-[1000] rounded-2xl overflow-hidden shadow-xl elevation-10 ${
          isDark ? "bg-[#262626]" : "bg-white"
        }`}
        style={{
          top: menuY,
          left: menuX,
          width: menuWidth,
        }}
      >
        <View className="pt-[10px] pb-[6px] items-center border-b border-black/5 dark:border-white/5">
          <Text 
            className={`text-[10px] font-semibold tracking-[0.4px] ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {formatTime(message.createdAt)}
          </Text>
        </View>

        <Pressable
          onPress={() => onAction("Reply")}
          className="flex-row items-center h-[48px] px-4 active:bg-black/5 dark:active:bg-white/5"
        >
          <Ionicons name="arrow-undo-outline" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          <Text className={`text-[15px] font-medium ml-3 ${isDark ? "text-white" : "text-black"}`}>Reply</Text>
        </Pressable>

        {isMe && (
          <>
            <View className={`h-[0.5px] w-full ${isDark ? "bg-white/10" : "bg-black/5"}`} />
            <Pressable
              onPress={() => onAction("Edit")}
              className="flex-row items-center h-[48px] px-4 active:bg-black/5 dark:active:bg-white/5"
            >
              <Ionicons name="create-outline" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
              <Text className={`text-[15px] font-medium ml-3 ${isDark ? "text-white" : "text-black"}`}>Edit</Text>
            </Pressable>

            <View className={`h-[0.5px] w-full ${isDark ? "bg-white/10" : "bg-black/5"}`} />
            <Pressable
              onPress={() => onAction("Delete")}
              className="flex-row items-center h-[48px] px-4 active:bg-black/5 dark:active:bg-white/5"
            >
              <Ionicons name="trash-outline" size={20} color="#FF453A" />
              <Text className="text-[15px] font-medium ml-3 text-[#FF453A]">Unsend</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </View>
  );
};
