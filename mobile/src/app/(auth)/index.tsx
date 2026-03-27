import { useThemePreference } from "@/contexts/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AuthScreen = () => {
  const router = useRouter();
  const { resolvedTheme } = useThemePreference();

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
      <SafeAreaView className="flex-1 justify-between py-6">
        {/* hero section */}
        <View className="items-center pt-4">
          <View className="w-16 h-16 rounded-[20px] bg-primary items-center justify-center shadow-lg shadow-primary/30">
            <Ionicons name="chatbubbles" size={30} color="#F8FAFC" />
          </View>
          <Text className="text-3xl font-extrabold text-foreground dark:text-foreground-dark tracking-tight mt-4">
            KabuChat
          </Text>
          <Text className="text-foreground-muted dark:text-foreground-muted-dark text-[15px] mt-1.5 tracking-wide">
            Connect instantly, chat seamlessly
          </Text>
        </View>

        {/* Illustration */}
        <View className="items-center px-6">
          <Image
            source={require("@/assets/images/auth1.png")}
            style={{ width: 320, height: 350 }}
            contentFit="cover"
          />
        </View>
        {/* Buttons */}
        <View className="px-8 gap-y-4">
          {/* Login Button */}
          <Pressable
            onPress={() => router.push("./login")}
            className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98]"
          >
            <Text className="text-slate-50 text-lg font-bold">Login</Text>
          </Pressable>

          {/* Sign Up Button */}
          <Pressable
            onPress={() => router.push("./signup")}
            className="w-full bg-surface-elevated dark:bg-surface-elevated-dark border border-primary/40 h-14 rounded-full items-center justify-center active:scale-[0.98]"
          >
            <Text className="text-primary text-lg font-bold">Sign Up</Text>
          </Pressable>
        </View>
        {/* Footer */}
        <View className="px-10">
          <Text className="text-foreground-subtle dark:text-foreground-subtle-dark text-[11px] text-center leading-4">
            By continuing, you agree to our{" "}
            <Text className="text-primary font-medium">Terms of Service</Text>{" "}
            and <Text className="text-primary font-medium">Privacy Policy</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default AuthScreen;
