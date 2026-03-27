import { Conversation } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface HomeCardProps {
    conversation: Conversation;
    currentUserId?: string | null;
    onPress: () => void;
}

export const HomeCard: React.FC<HomeCardProps> = ({
    conversation,
    currentUserId,
    onPress,
}) => {
    const otherUser =
        conversation.members.find((member) => member.clerkId !== currentUserId) ||
        conversation.members[0];

    const isUnread = 
        conversation.lastMessage?.sender?.clerkId &&
        conversation.lastMessage.sender.clerkId !== currentUserId &&
        !(conversation.lastMessage.readByClerkIds?.includes(currentUserId ?? ""));

    const isMe = conversation.lastMessage?.sender?.clerkId === currentUserId;
    const senderName = isMe 
        ? "You" 
        : conversation.members.find(m => m.clerkId === conversation.lastMessage?.sender?.clerkId)?.name?.split(" ")[0] || "Someone";
    
    // We only explicitly prepend the sender name in group chats
    // Or in DMs if it's "You:"
    const showPrefix = conversation.lastMessage && (conversation.isGroup || isMe);
    const prefix = showPrefix ? `${senderName}: ` : "";

    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center bg-surface-elevated dark:bg-surface-elevated-dark p-4 mb-3 rounded-2xl border border-border dark:border-border-dark shadow-sm shadow-black/5 active:bg-surface dark:active:bg-surface-dark"
        >
            {/* Avatar Section */}
            <View className="relative">
                <View className="p-1 bg-surface-elevated dark:bg-surface-elevated-dark rounded-3xl shadow-sm shadow-primary/10 border border-border dark:border-border-dark">
                    {otherUser?.avatar ? (
                        <Image
                            source={otherUser.avatar}
                            style={{ width: 50, height: 50, borderRadius: 25 }}
                            contentFit="cover"
                        />
                    ) : (
                        <View className="w-[50px] h-[50px] rounded-full bg-surface dark:bg-surface-dark items-center justify-center">
                            <Ionicons name="person" size={24} color={COLORS.textMuted} />
                        </View>
                    )}
                </View>
            </View>

            {/* Content Section */}
            <View className="flex-1 ml-4 justify-center">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-black text-foreground dark:text-foreground-dark tracking-tight">
                        {conversation.isGroup && conversation.name
                            ? conversation.name
                            : otherUser?.name ?? "Unknown user"}
                    </Text>
                    {conversation.lastMessage?.createdAt && (
                        <Text className={`text-[10px] font-bold ${isUnread ? 'text-primary' : 'text-foreground-subtle dark:text-foreground-subtle-dark'}`}>
                            {new Date(conversation.lastMessage.createdAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                            )}
                        </Text>
                    )}
                </View>

                <Text
                    numberOfLines={1}
                    className={`text-sm tracking-tight ${isUnread ? 'font-black text-foreground dark:text-foreground-dark' : 'font-bold text-foreground-muted dark:text-foreground-muted-dark'}`}
                >
                    {conversation.lastMessage
                        ? `${prefix}${conversation.lastMessage.content}`
                        : "Start a convo"}
                </Text>
            </View>

            {/* Action/chevron Section */}
            <View className="ml-3 justify-center items-center">
                {isUnread ? (
                   <View className="w-3 h-3 rounded-full bg-primary" />
                ) : (
                   <Ionicons name="chevron-forward" size={16} color="#E2E8F0" />
                )}
            </View>
        </Pressable>
    );
};
