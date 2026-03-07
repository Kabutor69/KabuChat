import useSocialAuth from "@/hooks/useSocialAuth";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
  const params = useLocalSearchParams();
  const email = (params.email as string) || "your email";
  const { handleVerifyEmail, handleResendVerificationEmail, loadingStrategy } =
    useSocialAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);

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
              <Ionicons name="mail-open" size={30} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-extrabold text-foreground tracking-tight mt-4">
              Verify Email
            </Text>
            <Text className="text-foreground-muted text-[15px] mt-1.5 tracking-wide text-center px-10">
              Enter the code sent to {"\n"}
              <Text className="font-bold text-primary">{email}</Text>
            </Text>
          </View>

          {/* Content */}
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
              source={require("@/assets/images/verify.png")}
              style={{ width: 180, height: 180, marginBottom: 20 }}
              contentFit="cover"
            />

            <View className="w-full gap-y-6">
              {/* Status Messages */}
              {success ? (
                <View className="bg-green-50 border border-green-200 p-3 rounded-xl">
                  <Text className="text-green-600 text-center text-xs font-semibold">
                    {success}
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View className="bg-red-50 border border-red-200 p-3 rounded-xl">
                  <Text className="text-red-600 text-center text-xs font-semibold">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Code Input Container */}
              <View className="gap-y-3">
                <View className="flex-row justify-between items-center px-1">
                  <Text className="text-foreground font-bold">
                    Verification Code
                  </Text>
                  <Text
                    className={`text-[11px] font-bold ${timeLeft <= 60 ? "text-red-500" : "text-slate-400"}`}
                  >
                    Expires: {formatTime(timeLeft)}
                  </Text>
                </View>

                <TextInput
                  className="bg-white border border-primary/20 rounded-3xl h-16 text-center text-3xl font-black text-primary shadow-sm shadow-black/5 tracking-[15px]"
                  placeholder="000000"
                  placeholderTextColor="#E2E8F0"
                  value={code}
                  onChangeText={(text) =>
                    setCode(text.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  editable={loadingStrategy !== "email_verify"}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              {/* Resend Logic */}
              <View className="items-center">
                <Text className="text-slate-500 text-xs">
                  Did not receive the code?
                </Text>
                <Pressable
                  onPress={handleResend}
                  disabled={!canResend || loadingStrategy === "email_resend"}
                  className="mt-1"
                >
                  <Text
                    className={`font-bold ${canResend ? "text-primary" : "text-slate-300"}`}
                  >
                    {loadingStrategy === "email_resend"
                      ? "Sending..."
                      : "Resend New Code"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-8 gap-y-4">
            <Pressable
              onPress={handleVerify}
              disabled={
                loadingStrategy === "email_verify" ||
                code.length < 6 ||
                timeLeft <= 0
              }
              className="w-full bg-primary h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
            >
              {loadingStrategy === "email_verify" ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  Verify & Continue
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.back()}>
              <Text className="text-slate-500 text-center text-sm">
                Use a different email?{" "}
                <Text className="text-primary font-bold">Change Email</Text>
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="px-10 mt-6">
            <Text className="text-slate-400 text-[11px] text-center leading-4">
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

export default VerifyEmailScreen;
