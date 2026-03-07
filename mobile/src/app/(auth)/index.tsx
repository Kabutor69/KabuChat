import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AuthScreen = () => {
  const router = useRouter();

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

      <SafeAreaView className="flex-1 justify-between py-6">
        {/* hero section */}
        <View className="items-center pt-4">
          <View className="w-16 h-16 rounded-[20px] bg-primary items-center justify-center shadow-lg shadow-primary/30">
            <Ionicons name="chatbubbles" size={30} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-extrabold text-foreground tracking-tight mt-4">
            KabuChat
          </Text>
          <Text className="text-foreground-muted text-[15px] mt-1.5 tracking-wide">
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
            <Text className="text-white text-lg font-bold">Login</Text>
          </Pressable>

          {/* Sign Up Button */}
          <Pressable
            onPress={() => router.push("./signup")}
            className="w-full bg-white border border-primary h-14 rounded-full items-center justify-center active:scale-[0.98]"
          >
            <Text className="text-primary text-lg font-bold">Sign Up</Text>
          </Pressable>
        </View>
        {/* Footer */}
        <View className="px-10">
          <Text className="text-foreground-subtle text-[11px] text-center leading-4">
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
