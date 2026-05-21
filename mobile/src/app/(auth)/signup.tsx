import { useThemePreference } from "@/contexts/theme.context";
import useSocialAuth from "@/hooks/useSocialAuth";
import { checkUsernameAvailable } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
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
  const { resolvedTheme } = useThemePreference();
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

  // Input Focus States
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

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
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Scrollable Form */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 28,
              paddingBottom: 16,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Nav Bar */}
            <View className="flex-row items-center justify-between pt-2 pb-2">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full border border-border dark:border-border-dark items-center justify-center bg-surface-elevated dark:bg-surface-elevated-dark active:scale-[0.95]"
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={resolvedTheme === "dark" ? "#E8ECFF" : "#0A0E18"}
                />
              </Pressable>
              <View className="w-10" />
            </View>

            {/* Heading */}
            <View className="items-center pb-4 pt-1">
              <View className="w-16 h-16 rounded-[22px] bg-primary/10 dark:bg-primary/20 items-center justify-center border border-primary/20 dark:border-primary/30">
                <Ionicons name="chatbubbles" size={32} color="#5B4AFF" />
              </View>
              <Text className="text-3xl font-extrabold text-foreground dark:text-foreground-dark tracking-tight mt-3">
                Create Account
              </Text>
              <Text className="text-foreground-muted dark:text-foreground-muted-dark text-[15px] mt-1 text-center px-4">
                Join the KabuChat flock today 🐦
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-error/10 border border-error/20 py-3 px-4 rounded-2xl mb-4 flex-row items-center gap-x-2">
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text className="text-error text-xs font-semibold flex-1">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Input Group */}
            <View className="w-full gap-y-3.5">
              {/* Full Name */}
              <View className="gap-y-1">
                <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                  Full Name
                </Text>
                <View
                  className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5 ${
                    isNameFocused
                      ? "border-primary"
                      : "border-border dark:border-border-dark"
                  }`}
                >
                  <Ionicons name="person-outline" size={20} color="#94A3B8" />
                  <TextInput
                    placeholder="Kabu tor"
                    className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px]"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                  />
                </View>
              </View>

              {/* Username */}
              <View className="gap-y-1">
                <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                  Username
                </Text>
                <View
                  className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5 ${
                    isUsernameFocused
                      ? "border-primary"
                      : "border-border dark:border-border-dark"
                  }`}
                >
                  <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "600" }}>@</Text>
                  <TextInput
                    placeholder="username"
                    className="flex-1 ml-2 h-full text-foreground dark:text-foreground-dark text-[15px]"
                    value={username}
                    onChangeText={onUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setIsUsernameFocused(true)}
                    onBlur={() => setIsUsernameFocused(false)}
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
              <View className="gap-y-1">
                <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                  Email Address
                </Text>
                <View
                  className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5 ${
                    isEmailFocused
                      ? "border-primary"
                      : "border-border dark:border-border-dark"
                  }`}
                >
                  <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                  <TextInput
                    placeholder="example@gmail.com"
                    className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px]"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                  />
                </View>
              </View>

              {/* Password */}
              <View className="gap-y-1">
                <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                  Password
                </Text>
                <View
                  className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5 ${
                    isPasswordFocused
                      ? "border-primary"
                      : "border-border dark:border-border-dark"
                  }`}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#94A3B8"
                  />
                  <TextInput
                    placeholder="Minimum 8 characters"
                    secureTextEntry={!showPassword}
                    className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px]"
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="px-2"
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#94A3B8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="gap-y-1">
                <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                  Confirm Password
                </Text>
                <View
                  className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5 ${
                    isConfirmPasswordFocused
                      ? "border-primary"
                      : "border-border dark:border-border-dark"
                  }`}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#94A3B8"
                  />
                  <TextInput
                    placeholder="Verify password"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px]"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setIsConfirmPasswordFocused(true)}
                    onBlur={() => setIsConfirmPasswordFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="px-2"
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#94A3B8"
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Actions and Buttons */}
            <View className="gap-y-4 mt-6">
              <Pressable
                onPress={onEmailSignUp}
                disabled={loadingStrategy === "email_signup"}
                className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98] flex-row gap-x-2"
              >
                {loadingStrategy === "email_signup" ? (
                  <ActivityIndicator color="#F8FAFC" />
                ) : (
                  <>
                    <Text className="text-slate-50 text-base font-bold">
                      Create Account
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#F8FAFC" />
                  </>
                )}
              </Pressable>

              <View className="flex-row items-center my-1.5">
                <View className="flex-1 h-[1px] bg-border dark:bg-border-dark" />
                <Text className="px-3 text-xs font-semibold text-foreground-subtle dark:text-foreground-subtle-dark uppercase tracking-wider">
                  or continue with
                </Text>
                <View className="flex-1 h-[1px] bg-border dark:bg-border-dark" />
              </View>

              {/* Social Signup */}
              <View className="flex-row gap-x-3">
                <Pressable
                  onPress={() => handleSocialAuth("oauth_google")}
                  className="flex-1 bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark h-12 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm active:scale-[0.98]"
                >
                  <Ionicons name="logo-google" size={18} color="#DB4437" />
                  <Text className="font-bold text-[14px] text-foreground dark:text-foreground-dark">
                    Google
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSocialAuth("oauth_github")}
                  className="flex-1 bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark h-12 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm active:scale-[0.98]"
                >
                  <Ionicons
                    name="logo-github"
                    size={18}
                    color={resolvedTheme === "dark" ? "#E8ECFF" : "#0A0E18"}
                  />
                  <Text className="font-bold text-[14px] text-foreground dark:text-foreground-dark">
                    GitHub
                  </Text>
                </Pressable>
              </View>

              <Pressable onPress={() => router.push("./login")} className="mt-2 py-1">
                <Text className="text-foreground-muted dark:text-foreground-muted-dark text-center text-sm">
                  Already have an account?{" "}
                  <Text className="text-primary font-bold">Sign In</Text>
                </Text>
              </Pressable>

              {/* Footer */}
              <View className="px-4 mt-2">
                <Text className="text-foreground-subtle dark:text-foreground-subtle-dark text-[11px] text-center leading-4">
                  By continuing, you agree to our{" "}
                  <Text className="text-primary font-medium">Terms</Text> and{" "}
                  <Text className="text-primary font-medium">Privacy Policy</Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default SignUpScreen;
