import { UserSearchItem } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
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
    const [showPrimaryTooltip, setShowPrimaryTooltip] = useState(false);
    const [showSecondaryTooltip, setShowSecondaryTooltip] = useState(false);

    const getVariantStyles = (variant: string, loading: boolean) => {
        if (loading) return "bg-surface dark:bg-surface-dark";
        switch (variant) {
            case "danger": return "bg-red-500";
            case "secondary": return "bg-surface dark:bg-surface-dark";
            case "primary":
            default: return "bg-primary";
        }
    };

    const getIconColor = (variant: string, loading: boolean) => {
        if (loading) return "#64748B";
        switch (variant) {
            case "danger": return "#F8FAFC";
            case "secondary": return "#64748B";
            case "primary":
            default: return "#F8FAFC";
        }
    };

    const getIconName = (label: string) => {
        switch (label) {
            case "Message": return "chatbubbles";
            case "Add Friend": return "person-add-alt";
            case "Cancel Request": return "person-add-disabled";
            case "Remove":
            case "Remove Friend": return "person-off";
            default: return "checkmark";
        }
    };

    const isIconMaterial = (label: string) => {
        return ["Add Friend", "Cancel Request", "Remove", "Remove Friend"].includes(label);
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
                    <View>
                        <Pressable
                            onPress={onSecondaryAction}
                            onLongPress={() => setShowSecondaryTooltip(true)}
                            onPressOut={() => setShowSecondaryTooltip(false)}
                            delayLongPress={500}
                            disabled={isSecondaryLoading}
                            className={`h-10 w-10 rounded-[14px] items-center justify-center shadow-sm active:scale-95 ${getVariantStyles(secondaryActionVariant, isSecondaryLoading)}`}
                        >
                            {isSecondaryLoading ? (
                                <ActivityIndicator color={getIconColor(secondaryActionVariant, isSecondaryLoading)} size="small" />
                            ) : isIconMaterial(secondaryActionLabel) ? (
                                <MaterialIcons name={getIconName(secondaryActionLabel) as any} size={20} color={getIconColor(secondaryActionVariant, false)} />
                            ) : (
                                <Ionicons name={getIconName(secondaryActionLabel) as any} size={18} color={getIconColor(secondaryActionVariant, false)} />
                            )}
                        </Pressable>
                        {showSecondaryTooltip && (
                            <View className="absolute top-12 right-0 bg-foreground dark:bg-foreground-dark px-3 py-1.5 rounded-lg z-50">
                                <Text className="text-xs font-bold text-background dark:text-background-dark whitespace-nowrap">{secondaryActionLabel}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View>
                    <Pressable
                        onPress={onAction}
                        onLongPress={() => setShowPrimaryTooltip(true)}
                        onPressOut={() => setShowPrimaryTooltip(false)}
                        delayLongPress={500}
                        disabled={isLoading}
                        className={`h-10 w-10 rounded-[14px] items-center justify-center shadow-sm active:scale-95 ${getVariantStyles(actionVariant, isLoading)}`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={getIconColor(actionVariant, isLoading)} size="small" />
                        ) : isIconMaterial(actionLabel) ? (
                            <MaterialIcons name={getIconName(actionLabel) as any} size={20} color={getIconColor(actionVariant, false)} />
                        ) : (
                            <Ionicons name={getIconName(actionLabel) as any} size={18} color={getIconColor(actionVariant, false)} />
                        )}
                    </Pressable>
                    {showPrimaryTooltip && (
                        <View className="absolute top-12 right-0 bg-foreground dark:bg-foreground-dark px-3 py-1.5 rounded-lg z-50">
                            <Text className="text-xs font-bold text-background dark:text-background-dark whitespace-nowrap">{actionLabel}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};
