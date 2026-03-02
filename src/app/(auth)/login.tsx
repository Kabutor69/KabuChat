import useSocialAuth from "@/hooks/useSocialAuth";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LoginScreen = () => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { handleEmailSignIn, handleSocialAuth, loadingStrategy } =
    useSocialAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const onEmailSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    const { success, error: authError } = await handleEmailSignIn(
      email,
      password,
    );
    if (!success) {
      setError(authError || "Login failed");
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Background Gradient */}
      <View className="absolute inset-0">
        <LinearGradient
          colors={["#FFFFFF", "#F8F9FA", "#F1F3F5"]}
          locations={[0, 0.5, 1]}
          style={{ width: "100%", height: "100%" }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        className="flex-1"
      >
        <SafeAreaView className="flex-1 justify-between py-6">
          {/* Header */}
          <View className="items-center pt-4 relative">
            <Pressable
              onPress={() => router.back()}
              className="absolute left-6 top-4 p-2 z-10"
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </Pressable>

            <View className="w-16 h-16 rounded-[20px] bg-primary items-center justify-center shadow-lg shadow-primary/30">
              <Ionicons name="chatbubbles" size={30} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-extrabold text-foreground tracking-tight mt-4">
              Welcome Back
            </Text>
            <Text className="text-foreground-muted text-[15px] mt-1.5 tracking-wide">
              Log in to your KabuChat account
            </Text>
          </View>

          {/* Scrollable Content (Illustration + Inputs) */}
          <ScrollView
            className="flex-1 mt-4"
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              paddingHorizontal: 32,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Illustration */}
            <Image
              source={require("@/assets/images/login.png")}
              style={{ width: 180, height: 180, marginBottom: 20 }}
              contentFit="cover"
            />

            {/* Input Group */}
            <View className="w-full gap-y-4">
              {error ? (
                <Text className="text-red-500 text-center text-xs font-semibold bg-red-50 py-2 rounded-lg">
                  {error}
                </Text>
              ) : null}

              {/* Email Input */}
              <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5">
                <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                <TextInput
                  placeholder="Email"
                  className="flex-1 ml-3 h-full text-foreground"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Password Input */}
              <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#94A3B8"
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  className="flex-1 ml-3 h-full text-foreground"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#94A3B8"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="px-2"
                >
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#94A3B8"
                  />
                </Pressable>
              </View>

              <Pressable onPress={() => router.push("./forgot-password")}>
                <Text className="text-primary text-right text-xs font-bold px-1">
                  Forgot Password?
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Buttons Section */}
          <View className="px-8 gap-y-3 mt-4">
            <Pressable
              onPress={onEmailSignIn}
              disabled={loadingStrategy === "email_signin"}
              className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98]"
            >
              {loadingStrategy === "email_signin" ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Login</Text>
              )}
            </Pressable>

            {/* Social Connects */}
            <View className="flex-row gap-x-3">
              <Pressable
                onPress={() => handleSocialAuth("oauth_google")}
                disabled={loadingStrategy === "oauth_google"}
                className="flex-1 bg-white border border-gray-100 h-12 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm active:bg-slate-50"
              >
                <Ionicons name="logo-google" size={18} color="#DB4437" />
                <Text className="font-bold text-[13px] text-slate-700">
                  Google
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSocialAuth("oauth_github")}
                disabled={loadingStrategy === "oauth_github"}
                className="flex-1 bg-white border border-gray-100 h-12 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm active:bg-slate-50"
              >
                <Ionicons name="logo-github" size={18} color="#000" />
                <Text className="font-bold text-[13px] text-slate-700">
                  GitHub
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={() => router.push("./signup")} className="mt-2">
              <Text className="text-foreground-muted text-center text-sm">
                Don't have an account?{" "}
                <Text className="text-primary font-bold">Sign Up</Text>
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="px-10 mt-6">
            <Text className="text-foreground-subtle text-[11px] text-center leading-4">
              By continuing, you agree to our{" "}
              <Text className="text-primary font-medium">Terms of Service</Text>{" "}
              and{" "}
              <Text className="text-primary font-medium">Privacy Policy</Text>
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;
