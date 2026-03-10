import useSocialAuth from "@/hooks/useSocialAuth";
import { checkUsernameAvailable } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const SignUpScreen = () => {
  const router = useRouter();
  const { handleEmailSignUp, handleSocialAuth, loadingStrategy } =
    useSocialAuth();

  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onUsernameChange = useCallback(
    async (value: string) => {
      const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
      setUsername(normalized);

      if (normalized.length < 3) {
        setUsernameStatus(normalized.length === 0 ? "idle" : "invalid");
        return;
      }
      if (!USERNAME_REGEX.test(normalized)) {
        setUsernameStatus("invalid");
        return;
      }

      setUsernameStatus("checking");
      try {
        const { available } = await checkUsernameAvailable(normalized);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    },
    [],
  );

  const onEmailSignUp = async () => {
    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setError("Username must be 3-20 characters: letters, numbers, underscores only");
      return;
    }
    if (usernameStatus === "taken") {
      setError("That username is already taken. Please choose another.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");

    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    const {
      success,
      needsVerification,
      error: authError,
    } = await handleEmailSignUp(email, password, firstName, lastName, username);

    if (needsVerification) {
      router.push({ pathname: "./verify-email", params: { email } });
    } else if (!success) {
      setError(authError || "Sign up failed");
    }
  };

  const usernameHintColor =
    usernameStatus === "available"
      ? "#22C55E"
      : usernameStatus === "taken" || usernameStatus === "invalid"
        ? "#EF4444"
        : "#94A3B8";

  const usernameHint =
    usernameStatus === "available"
      ? "✓ Username available"
      : usernameStatus === "taken"
        ? "✗ Username already taken"
        : usernameStatus === "invalid"
          ? "3-20 chars: letters, numbers, underscores only"
          : usernameStatus === "checking"
            ? "Checking…"
            : null;

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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 10}
        className="flex-1"
      >
        <SafeAreaView className="flex-1 justify-between py-6">
          {/* Header */}
          <View className="items-center pt-2 relative">
            <Pressable
              onPress={() => router.back()}
              className="absolute left-6 top-2 p-2 z-10"
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </Pressable>

            <View className="w-14 h-14 rounded-[18px] bg-primary items-center justify-center shadow-lg shadow-primary/30">
              <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
            </View>
            <Text className="text-2xl font-extrabold text-foreground tracking-tight mt-3">
              Create Account
            </Text>
            <Text className="text-foreground-muted text-[14px] mt-1 tracking-wide">
              Join the KabuChat flock today 🐦
            </Text>
          </View>

          {/* Scrollable Form */}
          <ScrollView
            className="flex-1 mt-4"
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              paddingHorizontal: 30,
              paddingBottom: 20,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Illustration for Signup */}
            <Image
              source={require("@/assets/images/register.png")}
              style={{ width: 160, height: 160, marginBottom: 15 }}
              contentFit="cover"
            />

            <View className="w-full gap-y-3.5">
              {error ? (
                <View className="bg-red-50 border border-red-100 py-2.5 rounded-xl">
                  <Text className="text-red-600 text-center text-xs font-semibold">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Full Name */}
              <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-13 shadow-sm shadow-black/5">
                <Ionicons name="person-outline" size={18} color="#94A3B8" />
                <TextInput
                  placeholder="Full Name"
                  className="flex-1 ml-3 h-12 text-foreground"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Username */}
              <View>
                <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-13 shadow-sm shadow-black/5">
                  <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "600" }}>@</Text>
                  <TextInput
                    placeholder="username"
                    className="flex-1 ml-2 h-12 text-foreground"
                    value={username}
                    onChangeText={onUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#94A3B8"
                  />
                  {usernameStatus === "checking" && (
                    <ActivityIndicator size="small" color="#94A3B8" />
                  )}
                </View>
                {usernameHint ? (
                  <Text style={{ color: usernameHintColor, fontSize: 11, marginTop: 4, marginLeft: 4 }}>
                    {usernameHint}
                  </Text>
                ) : null}
              </View>

              {/* Email */}
              <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-13 shadow-sm shadow-black/5">
                <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                <TextInput
                  placeholder="Email"
                  className="flex-1 ml-3 h-12 text-foreground"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Password */}
              <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-13 shadow-sm shadow-black/5">
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#94A3B8"
                />
                <TextInput
                  placeholder="Password (8+ chars)"
                  secureTextEntry={!showPassword}
                  className="flex-1 ml-3 h-12 text-foreground"
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
                    size={18}
                    color="#94A3B8"
                  />
                </Pressable>
              </View>

              {/* Confirm Password */}
              <View className="w-full bg-white border border-primary/10 rounded-2xl px-4 flex-row items-center h-13 shadow-sm shadow-black/5">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#94A3B8"
                />
                <TextInput
                  placeholder="Confirm Password"
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 ml-3 h-12 text-foreground"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#94A3B8"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="px-2"
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={18}
                    color="#94A3B8"
                  />
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View className="px-8 gap-y-3">
            <Pressable
              onPress={onEmailSignUp}
              disabled={loadingStrategy === "email_signup"}
              className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98]"
            >
              {loadingStrategy === "email_signup" ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  Create Account
                </Text>
              )}
            </Pressable>

            <View className="flex-row gap-x-3">
              <Pressable
                onPress={() => handleSocialAuth("oauth_google")}
                className="flex-1 bg-white border border-gray-100 h-12 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm"
              >
                <Ionicons name="logo-google" size={18} color="#DB4437" />
                <Text className="font-bold text-[13px] text-slate-700">
                  Google
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSocialAuth("oauth_github")}
                className="flex-1 bg-white border border-gray-100 h-12 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm"
              >
                <Ionicons name="logo-github" size={18} color="#000" />
                <Text className="font-bold text-[13px] text-slate-700">
                  GitHub
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={() => router.push("./login")} className="mt-1">
              <Text className="text-foreground-muted text-center text-sm">
                Already have an account?{" "}
                <Text className="text-primary font-bold">Sign In</Text>
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="px-10 mt-5">
            <Text className="text-foreground-subtle text-[11px] text-center leading-4">
              By continuing, you agree to our{" "}
              <Text className="text-primary font-medium">Terms</Text> and{" "}
              <Text className="text-primary font-medium">Privacy Policy</Text>
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignUpScreen;
