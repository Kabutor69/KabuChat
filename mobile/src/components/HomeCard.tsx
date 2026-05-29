import { Conversation } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { cacheGet } from "@/lib/cache";

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
    // Get cached members for offline avatar/name fallback
    const cachedMembers = useMemo(() => {
        return cacheGet<Record<string, any>>("members") || {};
    }, []);

    // Find the other user in conversation
    const otherUser = conversation.members.find((member) => member.clerkId !== currentUserId) 
        || conversation.members[0];

    // Use cached member data as fallback for offline avatars
    const otherUserAvatar = otherUser?.avatar || (otherUser?.clerkId ? cachedMembers[otherUser.clerkId]?.imageUrl || cachedMembers[otherUser.clerkId]?.avatar : undefined);
    const otherUserName = otherUser?.name || (otherUser?.clerkId ? cachedMembers[otherUser.clerkId]?.name || cachedMembers[otherUser.clerkId]?.username : undefined);

    // Get sender of last message with fallback
    const lastMessageSender = conversation.lastMessage?.sender;
    const senderInfo = lastMessageSender 
        ? conversation.members.find(m => m.clerkId === lastMessageSender.clerkId)
        : null;

    const isUnread =
        conversation.lastMessage?.sender?.clerkId &&
        conversation.lastMessage.sender.clerkId !== currentUserId &&
        !(conversation.lastMessage.readByClerkIds?.includes(currentUserId ?? ""));

    const isMe = conversation.lastMessage?.sender?.clerkId === currentUserId;
    const senderName = isMe
        ? "You"
        : senderInfo?.name?.split(" ")[0] || lastMessageSender?.clerkId?.split("_")[0] || "Someone";

    // Show prefix in group chats or for "You:" in DMs
    const showPrefix = conversation.lastMessage && (conversation.isGroup || isMe);
    const prefix = showPrefix ? `${senderName}: ` : "";

    // Format time safely
    const formatTime = (dateStr: string | undefined) => {
        if (!dateStr) return "";
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch {
            return "";
        }
    };

    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center bg-surface-elevated dark:bg-surface-elevated-dark p-4 mb-3 rounded-2xl border border-border dark:border-border-dark shadow-sm shadow-black/5 active:bg-surface dark:active:bg-surface-dark"
        >
            {/* Avatar Section */}
            <View className="relative">
                <View className="p-1 bg-surface-elevated dark:bg-surface-elevated-dark rounded-3xl shadow-sm shadow-primary/10 border border-border dark:border-border-dark">
                    {otherUserAvatar ? (
                        <Image
                            source={otherUserAvatar}
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
                            : otherUserName ?? "Unknown user"}
                    </Text>
                    {conversation.lastMessage?.createdAt && (
                        <Text className={`text-[10px] font-bold ${isUnread ? 'text-primary' : 'text-foreground-subtle dark:text-foreground-subtle-dark'}`}>
                            {formatTime(conversation.lastMessage.createdAt)}
                        </Text>
                    )}
                </View>

                <Text
                    numberOfLines={1}
                    className={`text-sm tracking-tight ${isUnread ? 'font-black text-foreground dark:text-foreground-dark' : 'font-bold text-foreground-muted dark:text-foreground-muted-dark'}`}
                >
                    {conversation.lastMessage
                        ? `${prefix}${conversation.lastMessage.content || "This message was deleted"}`
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
