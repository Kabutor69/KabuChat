import { useThemePreference } from "@/contexts/theme.context";
import useSocialAuth from "@/hooks/useSocialAuth";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
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

type ResetStep = "email" | "code" | "password";

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const { resolvedTheme } = useThemePreference();
  const { isLoaded, signIn } = useSignIn();
  const { handlePasswordReset } = useSocialAuth();

  // Logic States
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI States
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Input Focus States
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const handleSendCode = async () => {
    if (!isLoaded) return;
    if (!email) {
      setError("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setSuccess("Check your email for the reset code");
      setStep("code");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded) return;

    if (step === "code") {
      if (!code) {
        setError("Please enter the reset code");
        return;
      }
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const result = await signIn?.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code,
        });

        if (result?.status === "needs_new_password") {
          setStep("password");
          setSuccess("Code verified. Enter your new password.");
        } else {
          setError("Code verification failed");
        }
      } catch (err: any) {
        setError(err?.errors?.[0]?.message || "Invalid code");
      } finally {
        setLoading(false);
      }
    } else if (step === "password") {
      if (!newPassword || !confirmPassword) {
        setError("Please fill in all fields");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const { success: resetSuccess, error: resetError } =
          await handlePasswordReset(newPassword);
        if (resetSuccess) {
          setSuccess("Password reset successfully!");
          setTimeout(() => router.replace("./login"), 2000);
        } else {
          setError(resetError || "Failed to reset password");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Scrollable Content */}
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
                <Ionicons name="key-outline" size={32} color="#5B4AFF" />
              </View>
              <Text className="text-3xl font-extrabold text-foreground dark:text-foreground-dark tracking-tight mt-3">
                Reset Password
              </Text>
              <Text className="text-foreground-muted dark:text-foreground-muted-dark text-[15px] mt-1 text-center px-4 leading-relaxed">
                {step === "email" && "Recover your account access"}
                {step === "code" && "Verify the 6-digit code sent to your email"}
                {step === "password" && "Secure your new credentials"}
              </Text>
            </View>

            {/* Status Messages */}
            {success ? (
              <View className="bg-success/10 border border-success/20 p-3.5 rounded-2xl mb-4 flex-row items-center gap-x-2">
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                <Text className="text-success text-xs font-semibold flex-1">
                  {success}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View className="bg-error/10 border border-error/20 p-3.5 rounded-2xl mb-4 flex-row items-center gap-x-2">
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text className="text-error text-xs font-semibold flex-1">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Input Group */}
            <View className="w-full gap-y-4">
              {/* Email */}
              {step === "email" && (
                <View className="gap-y-1.5">
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
              )}

              {/* Code */}
              {step === "code" && (
                <View className="gap-y-1.5">
                  <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                    Reset Code
                  </Text>
                  <View
                    className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5 ${
                      isCodeFocused
                        ? "border-primary"
                        : "border-border dark:border-border-dark"
                    }`}
                  >
                    <Ionicons name="keypad-outline" size={20} color="#94A3B8" />
                    <TextInput
                      placeholder="Enter 6-digit code"
                      className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px] font-bold tracking-[3px]"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setIsCodeFocused(true)}
                      onBlur={() => setIsCodeFocused(false)}
                    />
                  </View>
                </View>
              )}

              {/* Password */}
              {step === "password" && (
                <View className="gap-y-4">
                  {/* New Password */}
                  <View className="gap-y-1.5">
                    <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider ml-1">
                      New Password
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
                        secureTextEntry={!showPass}
                        className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px]"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholderTextColor="#94A3B8"
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                      />
                      <Pressable onPress={() => setShowPass(!showPass)} className="px-2">
                        <Ionicons
                          name={showPass ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color="#94A3B8"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View className="gap-y-1.5">
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
                        secureTextEntry={!showConfirm}
                        className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark text-[15px]"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholderTextColor="#94A3B8"
                        onFocus={() => setIsConfirmPasswordFocused(true)}
                        onBlur={() => setIsConfirmPasswordFocused(false)}
                      />
                      <Pressable onPress={() => setShowConfirm(!showConfirm)} className="px-2">
                        <Ionicons
                          name={showConfirm ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color="#94A3B8"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Actions */}
            <View className="gap-y-4 mt-6">
              <Pressable
                onPress={step === "email" ? handleSendCode : handleResetPassword}
                disabled={loading}
                className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98] flex-row gap-x-2"
              >
                {loading ? (
                  <ActivityIndicator color="#F8FAFC" />
                ) : (
                  <>
                    <Text className="text-slate-50 text-base font-bold">
                      {step === "email"
                        ? "Send Code"
                        : step === "code"
                          ? "Verify Code"
                          : "Update Password"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#F8FAFC" />
                  </>
                )}
              </Pressable>

              <Pressable onPress={() => router.replace("./login")} className="mt-2 py-1">
                <Text className="text-foreground-muted dark:text-foreground-muted-dark text-center text-sm">
                  Remembered it?{" "}
                  <Text className="text-primary font-bold">Sign In</Text>
                </Text>
              </Pressable>

              {/* Footer */}
              <View className="px-4 mt-2">
                <Text className="text-foreground-subtle dark:text-foreground-subtle-dark text-[11px] text-center leading-4">
                  By continuing, you agree to our{" "}
                  <Text className="text-primary font-medium">Terms of Service</Text>{" "}
                  and{" "}
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

export default ForgotPasswordScreen;
