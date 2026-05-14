import React from "react";
import { Pressable, Text, View, LayoutRectangle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type ChatMessage } from "../lib/api";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

interface MessageBubbleProps {
  item: ChatMessage;
  isMe: boolean;
  isDark: boolean;
  isLastRead: boolean;
  onLongPress: (message: ChatMessage, position: LayoutRectangle) => void;
  onReplyPress?: (replyToId: string) => void;
  isHighlighted?: boolean;
  onSwipeToReply?: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  item,
  isMe,
  isDark,
  isLastRead,
  onLongPress,
  onReplyPress,
  isHighlighted,
  onSwipeToReply,
}) => {
  const bubbleRef = React.useRef<View>(null);
  const translateX = useSharedValue(0);
  const swipeThreshold = 60;

  const handleLongPress = () => {
    bubbleRef.current?.measureInWindow((x, y, width, height) => {
      onLongPress(item, { x, y, width, height });
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(isMe ? [-10, 0] : [0, 10])
    .onUpdate((e) => {
      if (!isMe) {
        // Others : Swipe Left to Right
        if (e.translationX > 0) {
          translateX.value = Math.min(e.translationX, 100);
        }
      } else {
        // Me : Swipe Right to Left
        if (e.translationX < 0) {
          translateX.value = Math.max(e.translationX, -100);
        }
      }
    })
    .onEnd((e) => {
      if (!isMe && e.translationX > swipeThreshold) {
        if (onSwipeToReply) runOnJS(onSwipeToReply)(item);
      } else if (isMe && e.translationX < -swipeThreshold) {
        if (onSwipeToReply) runOnJS(onSwipeToReply)(item);
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const iconStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const opacity = interpolate(absX, [0, swipeThreshold / 2, swipeThreshold], [0, 0.5, 1], Extrapolation.CLAMP);
    const scale = interpolate(absX, [0, swipeThreshold], [0.5, 1.2], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  if (item.isDeleted) {
    return (
      <View
        className={`max-w-[75%] px-3.5 py-2.5 ${isMe ? "self-end rounded-xl rounded-tr-none" : "self-start rounded-xl rounded-tl-none"
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
    <View
      ref={bubbleRef}
      className={`max-w-[75%] ${isMe ? "self-end" : "self-start"} relative`}
    >
      {/* Swipe Action Icon */}
      <Animated.View
        style={[
          iconStyle,
          {
            position: "absolute",
            top: "50%",
            marginTop: -15,
            [isMe ? "right" : "left"]: -40,
            zIndex: -1,
          },
        ]}
      >
        <View className="bg-primary/20 p-2 rounded-full">
          <Ionicons name="arrow-undo" size={20} color="#6366F1" />
        </View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onLongPress={handleLongPress}
            delayLongPress={400}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <View
              style={[
                isHighlighted && {
                  backgroundColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
                  borderRadius: 12,
                  padding: 2,
                }
              ]}
            >
              {item.replyTo ? (
                <Pressable
                  onPress={() => onReplyPress?.(item.replyTo!.id)}
                  className={`px-3 py-1.5 mb-0.5 rounded-t-lg ${isMe ? "rounded-tr-none" : "rounded-tl-none"}`}
                  style={({ pressed }) => ({
                    backgroundColor: isDark
                      ? pressed ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.15)"
                      : pressed ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
                    borderLeftWidth: 3,
                    borderLeftColor: "#6366F1",
                  })}
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
                </Pressable>
              ) : null}

              <View
                className={`px-3.5 py-2.5 ${isMe
                    ? "bg-primary rounded-xl rounded-tr-none shadow-sm"
                    : "bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-xl rounded-tl-none shadow-sm"
                  } ${item.replyTo ? "rounded-t-lg" : ""}`}
              >
                <Text className={isMe ? "text-slate-50 text-[15px] leading-5" : "text-foreground dark:text-foreground-dark text-[15px] leading-5"}>
                  {item.content}
                </Text>
                {item.isEdited && (
                  <View className="flex-row items-center justify-end mt-0.5">
                    <Text
                      className="text-[10px]"
                      style={{
                        color: isMe ? "rgba(248, 250, 252, 0.6)" : isDark ? "#6B7280" : "#9CA3AF",
                        fontStyle: "italic",
                      }}
                    >
                      edited
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {isLastRead && (
        <View className="mt-1 self-end mr-1">
          <Text className="text-foreground-muted dark:text-foreground-muted-dark text-[10px] font-medium tracking-wide">Seen</Text>
        </View>
      )}
    </View>
  );
};
