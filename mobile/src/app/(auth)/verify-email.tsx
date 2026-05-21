import { useThemePreference } from "@/contexts/theme.context";
import useSocialAuth from "@/hooks/useSocialAuth";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

const VerifyEmailScreen = () => {
  const router = useRouter();
  const { resolvedTheme } = useThemePreference();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "your email";
  const { handleVerifyEmail, handleResendVerificationEmail, loadingStrategy } =
    useSocialAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);

  // Input Focus State
  const [isCodeFocused, setIsCodeFocused] = useState(false);

  // Timer Logic
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    const { success: verifySuccess, error: verifyError } =
      await handleVerifyEmail(code);
    if (verifySuccess) {
      setSuccess("Email verified successfully!");
      setError("");
    } else {
      setError(verifyError || "Verification failed");
      setSuccess("");
    }
  };

  const handleResend = async () => {
    const { success: resendSuccess, error: resendError } =
      await handleResendVerificationEmail();
    if (resendSuccess) {
      setSuccess("Code sent to your email!");
      setError("");
      setTimeLeft(300);
      setCanResend(false);
      setCode("");
    } else {
      setError(resendError || "Failed to resend code");
      setSuccess("");
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
                <Ionicons name="mail-open-outline" size={32} color="#5B4AFF" />
              </View>
              <Text className="text-3xl font-extrabold text-foreground dark:text-foreground-dark tracking-tight mt-3">
                Verify Email
              </Text>
              <Text className="text-foreground-muted dark:text-foreground-muted-dark text-[15px] mt-1 text-center px-4 leading-relaxed">
                Enter the verification code sent to{"\n"}
                <Text className="font-bold text-primary">{email}</Text>
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
              <View className="gap-y-1.5">
                <View className="flex-row justify-between items-center px-1">
                  <Text className="text-xs font-bold text-foreground-muted dark:text-foreground-muted-dark uppercase tracking-wider">
                    Verification Code
                  </Text>
                  <Text
                    className={`text-[11px] font-bold ${
                      timeLeft <= 60 ? "text-red-500" : "text-foreground-subtle dark:text-foreground-subtle-dark"
                    }`}
                  >
                    Expires: {formatTime(timeLeft)}
                  </Text>
                </View>

                <View
                  className={`w-full bg-surface-elevated dark:bg-surface-elevated-dark border rounded-[24px] px-4 flex-row items-center h-16 shadow-sm shadow-black/5 ${
                    isCodeFocused
                      ? "border-primary"
                      : "border-border dark:border-border-dark"
                  }`}
                >
                  <TextInput
                    className="flex-1 h-full text-center text-3xl font-black text-primary tracking-[12px]"
                    placeholder="000000"
                    placeholderTextColor="#E2E8F0"
                    value={code}
                    onChangeText={(text) =>
                      setCode(text.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    editable={loadingStrategy !== "email_verify"}
                    keyboardType="number-pad"
                    maxLength={6}
                    onFocus={() => setIsCodeFocused(true)}
                    onBlur={() => setIsCodeFocused(false)}
                  />
                </View>
              </View>

              {/* Resend Logic */}
              <View className="items-center py-2 bg-surface/50 dark:bg-surface-dark/50 rounded-2xl p-4 border border-border/50 dark:border-border-dark/50">
                <Text className="text-foreground-muted dark:text-foreground-muted-dark text-xs">
                  Did not receive the code?
                </Text>
                <Pressable
                  onPress={handleResend}
                  disabled={!canResend || loadingStrategy === "email_resend"}
                  className="mt-1"
                >
                  <Text
                    className={`font-bold text-sm ${
                      canResend
                        ? "text-primary"
                        : "text-foreground-subtle dark:text-foreground-subtle-dark"
                    }`}
                  >
                    {loadingStrategy === "email_resend"
                      ? "Sending..."
                      : "Resend New Code"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-y-4 mt-6">
              <Pressable
                onPress={handleVerify}
                disabled={
                  loadingStrategy === "email_verify" ||
                  code.length < 6 ||
                  timeLeft <= 0
                }
                className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-50 flex-row gap-x-2"
              >
                {loadingStrategy === "email_verify" ? (
                  <ActivityIndicator color="#F8FAFC" />
                ) : (
                  <>
                    <Text className="text-slate-50 text-base font-bold">
                      Verify & Continue
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#F8FAFC" />
                  </>
                )}
              </Pressable>

              <Pressable onPress={() => router.back()} className="mt-2 py-1">
                <Text className="text-foreground-muted dark:text-foreground-muted-dark text-center text-sm">
                  Use a different email?{" "}
                  <Text className="text-primary font-bold">Change Email</Text>
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

export default VerifyEmailScreen;
