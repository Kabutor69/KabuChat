import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemePreference } from "@/contexts/theme.context";

type StartupSplashProps = {
  message?: string;
};

export function StartupSplash({ message = "Setting things up" }: StartupSplashProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { resolvedTheme } = useThemePreference();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.16,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [scaleAnim]);

  return (
    <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? "bg-background-dark" : "bg-background"}`}>
      <View className="items-center">
        <Animated.Image
          source={require("../../assets/images/icon.png")}
          resizeMode="contain"
          className="h-32 w-32 rounded-xl border-[16px] border-border-dark dark:border-border shadow-lg shadow-primary/20"
          style={{ transform: [{ scale: scaleAnim }] }}
        />

        <Text className={`mt-6 text-3xl font-black tracking-tight ${isDark ? "text-foreground-dark" : "text-foreground"}`}>
          Kabuchat
        </Text>

        <Text className={`mt-2 text-base font-medium ${isDark ? "text-foreground-muted-dark" : "text-foreground-muted"}`}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}
