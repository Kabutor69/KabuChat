import { useThemePreference } from "@/contexts/theme.context";
import useSocialAuth from "@/hooks/useSocialAuth";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
      <View className="absolute inset-0">
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
              <Ionicons
                name="chevron-back"
                size={24}
                color={resolvedTheme === "dark" ? "#E8ECFF" : "#0A0E18"}
              />
            </Pressable>

            <View className="w-16 h-16 rounded-[20px] bg-primary items-center justify-center shadow-lg shadow-primary/30">
              <Ionicons name="lock-open" size={30} color="#F8FAFC" />
            </View>
            <Text className="text-3xl font-extrabold text-foreground dark:text-foreground-dark tracking-tight mt-4">
              Reset Password
            </Text>
            <Text className="text-foreground-muted dark:text-foreground-muted-dark text-[15px] mt-1.5 tracking-wide text-center px-10">
              {step === "email" && "Recover your account access"}
              {step === "code" && "Verify the 6-digit code"}
              {step === "password" && "Secure your new credentials"}
            </Text>
          </View>

          {/* Form Content */}
          <ScrollView
            className="flex-1 mt-4"
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              paddingHorizontal: 32,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={require("@/assets/images/forget.png")}
              style={{ width: 180, height: 180, marginBottom: 20 }}
              contentFit="cover"
            />

            <View className="w-full gap-y-4">
              {success ? (
                <View className="bg-green-50 border border-green-200 p-3 rounded-xl flex-row items-center">
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text className="text-green-700 text-xs font-semibold ml-2 flex-1">
                    {success}
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View className="bg-red-50 border border-red-200 p-3 rounded-xl flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text className="text-red-600 text-xs font-semibold ml-2 flex-1">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Email Step */}
              {step === "email" && (
                <View className="w-full bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5">
                  <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                  <TextInput
                    placeholder="Your Email"
                    className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}

              {/* Code Step */}
              {step === "code" && (
                <View className="w-full bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5">
                  <Ionicons name="keypad-outline" size={20} color="#94A3B8" />
                  <TextInput
                    placeholder="Enter 6-digit code"
                    className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark font-bold tracking-[5px]"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}

              {/* Password Step */}
              {step === "password" && (
                <View className="gap-y-4">
                  <View className="w-full bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#94A3B8"
                    />
                    <TextInput
                      placeholder="New Password"
                      secureTextEntry={!showPass}
                      className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholderTextColor="#94A3B8"
                    />
                    <Pressable onPress={() => setShowPass(!showPass)}>
                      <Ionicons
                        name={showPass ? "eye" : "eye-off"}
                        size={20}
                        color="#94A3B8"
                      />
                    </Pressable>
                  </View>

                  <View className="w-full bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-2xl px-4 flex-row items-center h-14 shadow-sm shadow-black/5">
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#94A3B8"
                    />
                    <TextInput
                      placeholder="Confirm New Password"
                      secureTextEntry={!showConfirm}
                      className="flex-1 ml-3 h-full text-foreground dark:text-foreground-dark"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholderTextColor="#94A3B8"
                    />
                    <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                      <Ionicons
                        name={showConfirm ? "eye" : "eye-off"}
                        size={20}
                        color="#94A3B8"
                      />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Button Section */}
          <View className="px-8 gap-y-4">
            <Pressable
              onPress={step === "email" ? handleSendCode : handleResetPassword}
              disabled={loading}
              className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98]"
            >
              {loading ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <Text className="text-slate-50 text-lg font-bold">
                  {step === "email"
                    ? "Send Code"
                    : step === "code"
                      ? "Verify Code"
                      : "Update Password"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.replace("./login")}>
              <Text className="text-foreground-muted dark:text-foreground-muted-dark text-center text-sm">
                Remembered it?{" "}
                <Text className="text-primary font-bold">Sign In</Text>
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="px-10 mt-6">
            <Text className="text-foreground-subtle dark:text-foreground-subtle-dark text-[11px] text-center leading-4">
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

export default ForgotPasswordScreen;
