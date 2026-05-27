import { useThemePreference } from "@/contexts/theme.context";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StartupSplashProps = {
  message?: string;
};

export function StartupSplash({ message = "Starting up..." }: StartupSplashProps) {
  const { resolvedTheme } = useThemePreference();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.current.start();
    glowLoop.current.start();

    return () => {
      floatLoop.current?.stop();
      glowLoop.current?.stop();
    };
  }, [floatAnim, glowAnim]);

  const backgroundColors: readonly [string, string, string] =
    resolvedTheme === "dark"
      ? ["#050816", "#0B1220", "#111827"]
      : ["#FAFBFC", "#EEF2FF", "#FFFFFF"];

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const floatScale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.52],
  });

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={backgroundColors}
        className="absolute inset-0"
      />

      <View className="absolute inset-0 overflow-hidden">
        <View className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-primary/10 dark:bg-primary/20" />
        <View className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-sky-400/10 dark:bg-cyan-400/10" />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          style={{
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
          className="absolute h-56 w-56 rounded-full bg-primary/15 dark:bg-primary/25"
        />

        <Animated.View
          style={{
            transform: [{ translateY: floatY }, { scale: floatScale }],
          }}
          className="items-center"
        >
          <View className="items-center justify-center rounded-[40px] border border-white/70 bg-white p-5 shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-surfaceDark">
            <Image
              source={require("../../assets/images/icon.png")}
              resizeMode="contain"
              className="h-28 w-28 rounded-[32px]"
            />
          </View>

          <View className="mt-6 items-center">
            <Text className="text-3xl font-black tracking-tight text-foreground dark:text-foreground-dark">
              Kabuchat
            </Text>
            <Text className="mt-2 text-base font-medium text-foreground-muted dark:text-foreground-muted-dark">
              {message}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View className="absolute bottom-10 left-0 right-0 items-center">
        <View className="flex-row items-center gap-2 rounded-full border border-border/60 bg-white/75 px-4 py-2 dark:border-white/10 dark:bg-white/5">
          <View className="h-2 w-2 rounded-full bg-primary" />
          <Text className="text-xs font-medium text-foreground-muted dark:text-foreground-muted-dark">
            Setting things up
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
