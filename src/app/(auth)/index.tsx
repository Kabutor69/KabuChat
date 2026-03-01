import useSocialAuth from "@/hooks/useSocialAuth";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AuthScreen = () => {
  const { handleSocialAuth, loadingStrategy } = useSocialAuth();
  const isLoading = !!loadingStrategy;
  return (
    <View className="flex-1 items-center justify-center bg-background">
      {/* gradient bg */}
      <View className="absolute inset-0">
        <LinearGradient
          colors={["#FFFFFF", "#F8F9FA", "#F1F3F5"]}
          locations={[0, 0.5, 1]}
          style={{ width: "100%", height: "100%" }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <SafeAreaView className="flex-1 justify-between">
        {/* hero section */}
        <View className="items-center pt-10 pb-2">
          <View className="w-16 h-16 rounded-[20px] bg-primary items-center justify-center shadow-lg shadow-primary/30">
            <Ionicons name="chatbubbles" size={30} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-extrabold text-foreground tracking-tight mt-4 font-moonospace">
            KabuChat
          </Text>
          <Text className="text-foreground-muted text-[15px] mt-1.5 tracking-wide">
            Connect instantly, chat seamlessly
          </Text>
        </View>
        <View className="items-center px-6 mt-4">
          <Image
            source={require("@/assets/images/auth1.png")}
            style={{ width: 320, height: 350 }}
            contentFit="cover"
          />
        </View>
        {/* feature */}
        <View className="flex-row flex-wrap justify-center gap-3 px-6 mt-5">
          {[
            {
              icon: "videocam" as const,
              label: "Video Calls",
              color: "#6366F1",
              bg: "bg-primary/10 border-primary/20",
            },
            {
              icon: "chatbubbles" as const,
              label: "Groups",
              color: "#8B5CF6",
              bg: "bg-accent/10 border-accent/20",
            },
            {
              icon: "people" as const,
              label: "Find Friends",
              color: "#06B6D4",
              bg: "bg-accent-secondary/10 border-accent-secondary/20",
            },
          ].map((chip) => (
            <View
              key={chip.label}
              className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${chip.bg}`}
            >
              <Ionicons name={chip.icon} size={14} color={chip.color} />
              <Text className="text-foreground-muted text-xs font-semibold tracking-wide">
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
        <View className="px-8 pb-4">
          <View className="flex-row items-center gap-3 mb-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-foreground-subtle text-xs font-medium tracking-widest uppercase">
              Continue with
            </Text>
            <View className="flex-1 h-px bg-border" />
          </View>
        </View>
        <View className="flex-row justify-center items-center gap-4 mb-5">
          {[
            {
              id: "oauth_google" as const,
              label: "Continue with Google",
              className:
                "size-20 rounded-2xl bg-surface-elevated items-center justify-center active:scale-95 shadow-xl shadow-border/50 border border-border-light",
              icon: <Ionicons name="logo-google" size={28} color="#4285F4" />,
            },
            {
              id: "oauth_github" as const,
              label: "Continue with GitHub",
              className:
                "size-20 rounded-2xl bg-foreground items-center justify-center active:scale-95 shadow-xl shadow-foreground/20",
              icon: <Ionicons name="logo-github" size={28} color="#FFFFFF" />,
            },
          ].map((btn) => (
            <Pressable
              key={btn.id}
              className={btn.className}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={btn.label}
              onPress={() => !isLoading && handleSocialAuth(btn.id)}
            >
              {loadingStrategy === btn.id ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                btn.icon
              )}
            </Pressable>
          ))}
        </View>
        <Text className="text-foreground-subtle text-[11px] text-center leading-4">
          By continuing, you agree to our{" "}
          <Text className="text-primary">Terms of Service</Text> and{" "}
          <Text className="text-primary">Privacy Policy</Text>
        </Text>
      </SafeAreaView>
    </View>
  );
};

export default AuthScreen;
