import { UserSearchItem } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

interface ExploreCardProps {
    user: UserSearchItem;
    onAction: () => void;
    actionLabel: string;
    isLoading?: boolean;
    actionVariant?: "primary" | "danger" | "secondary";

    onSecondaryAction?: () => void;
    secondaryActionLabel?: string;
    isSecondaryLoading?: boolean;
    secondaryActionVariant?: "primary" | "danger" | "secondary";
}

export const ExploreCard: React.FC<ExploreCardProps> = ({
    user,
    onAction,
    actionLabel,
    isLoading = false,
    actionVariant = "primary",
    onSecondaryAction,
    secondaryActionLabel,
    isSecondaryLoading = false,
    secondaryActionVariant = "secondary",
}) => {
    const getVariantStyles = (variant: string, loading: boolean) => {
        if (loading) return "bg-surface dark:bg-surface-dark";
        switch (variant) {
            case "danger": return "bg-red-500";
            case "secondary": return "bg-surface dark:bg-surface-dark";
            case "primary":
            default: return "bg-primary";
        }
    };

    const getTextStyles = (variant: string) => {
        switch (variant) {
            case "danger": return "text-slate-50";
            case "secondary": return "text-foreground-muted dark:text-foreground-muted-dark";
            case "primary":
            default: return "text-slate-50";
        }
    };

    return (
        <View className="flex-row items-center bg-surface-elevated dark:bg-surface-elevated-dark p-4 mb-3 rounded-2xl border border-border dark:border-border-dark shadow-sm shadow-black/5">
            {/* Avatar Section */}
            <View className="p-1 bg-surface-elevated dark:bg-surface-elevated-dark rounded-3xl shadow-sm shadow-primary/10 border border-border dark:border-border-dark">
                {user.avatar ? (
                    <Image
                        source={user.avatar}
                        style={{ width: 50, height: 50, borderRadius: 25 }}
                        contentFit="cover"
                    />
                ) : (
                    <View className="w-[50px] h-[50px] rounded-full bg-surface dark:bg-surface-dark items-center justify-center">
                        <Ionicons name="person" size={24} color={COLORS.textMuted} />
                    </View>
                )}
            </View>

            {/* Content Section */}
            <View className="flex-1 ml-4 justify-center">
                <Text className="text-base font-black text-foreground dark:text-foreground-dark tracking-tight">
                    {user.username ?? "User"}
                </Text>
            </View>

            {/* Action Section */}
            <View className="flex-row items-center gap-2">
                {onSecondaryAction && secondaryActionLabel && (
                    <Pressable
                        onPress={onSecondaryAction}
                        disabled={isSecondaryLoading}
                        className={`h-10 rounded-[14px] px-3 items-center justify-center shadow-sm active:scale-95 ${getVariantStyles(secondaryActionVariant, isSecondaryLoading)}`}
                    >
                        {isSecondaryLoading ? (
                            <ActivityIndicator color={secondaryActionVariant === "secondary" ? "#64748B" : "#F8FAFC"} size="small" />
                        ) : (
                            <Text className={`text-sm font-bold ${getTextStyles(secondaryActionVariant)}`}>{secondaryActionLabel}</Text>
                        )}
                    </Pressable>
                )}

                <Pressable
                    onPress={onAction}
                    disabled={isLoading}
                    className={`h-10 rounded-[14px] px-3 items-center justify-center shadow-sm active:scale-95 ${getVariantStyles(actionVariant, isLoading)}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color={actionVariant === "secondary" ? "#64748B" : "#F8FAFC"} size="small" />
                    ) : (
                        <Text className={`text-sm font-bold ${getTextStyles(actionVariant)}`}>{actionLabel}</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
};
