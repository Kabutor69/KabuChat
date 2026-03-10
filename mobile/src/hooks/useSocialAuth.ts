import { useSSO, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert } from "react-native";

type EmailAuthError = {
  errors?: Array<{ message: string }>;
  message?: string;
};

const useSocialAuth = () => {
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
  const { startSSOFlow } = useSSO();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();

  // Social Auth
  const handleSocialAuth = async (
    strategy: "oauth_google" | "oauth_github",
  ) => {
    if (loadingStrategy) return;
    setLoadingStrategy(strategy);
    try {
      const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return;
      }

      // Handle missing requirements (e.g. unique username)
      if (signUp?.status === "missing_requirements") {
        const baseUsername = `${signUp.firstName || ""}${signUp.lastName || ""}`
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "");

        let suffix = "";
        let usernameToTry = baseUsername.slice(0, 15) || "user";

        while (true) {
          try {
            const finalUsername = `${usernameToTry}${suffix}`;
            const result = await signUp.update({ username: finalUsername });
            if (result.status === "complete" && result.createdSessionId) {
              if (setActiveSignUp) {
                await setActiveSignUp({ session: result.createdSessionId });
              }
              return;
            }
            break;
          } catch (err: any) {
            if (err?.errors?.[0]?.code === "form_identifier_exists") {
              suffix = Math.floor(Math.random() * 10000).toString();
              continue;
            }
            throw err;
          }
        }
      }

      const provider = strategy === "oauth_google" ? "Google" : "GitHub";
      Alert.alert(
        "sign-in failed",
        `${provider} sign-in failed. Please try again`,
      );
    } catch (error) {
      console.log("💥 Error in social auth:", error);
      const provider = strategy === "oauth_google" ? "Google" : "GitHub";
      Alert.alert(
        "Error",
        `Failed to sign in with ${provider}. Please try again.`,
      );
    } finally {
      setLoadingStrategy(null);
    }
  };

  // Email Login
  const handleEmailSignIn = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!signIn) {
      return { success: false, error: "Sign in not available" };
    }

    try {
      setLoadingStrategy("email_signin");
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result?.status === "complete") {
        // Activate the session
        if (result.createdSessionId && setActiveSignIn) {
          try {
            await setActiveSignIn({ session: result.createdSessionId });
            console.log("📧 Email sign in completed successfully");
          } catch (sessionError) {
            console.log("📧 Session activation error:", sessionError);
            return { success: false, error: "Failed to activate session" };
          }
        }
        return { success: true };
      } else {
        return { success: false, error: "Login failed. Please try again." };
      }
    } catch (error: unknown) {
      const err = error as EmailAuthError;
      const errorMessage =
        err?.errors?.[0]?.message || err?.message || "Login failed";
      console.log("📧 Email sign in error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingStrategy(null);
    }
  };

  // Email SignUp
  const handleEmailSignUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    username?: string,
  ): Promise<{
    success: boolean;
    error?: string;
    needsVerification?: boolean;
  }> => {
    if (!signUp) {
      return { success: false, error: "Sign up not available" };
    }

    try {
      setLoadingStrategy("email_signup");

      // Create the signup
      const result = await signUp.create({
        emailAddress: email,
        password,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(username && { username }),
      });

      // Send Email Verify Email
      if (result?.id) {
        try {
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          // Email verification prepared and code sent
          return { success: false, needsVerification: true };
        } catch (prepareError: unknown) {
          const err = prepareError as EmailAuthError;
          const errorMsg =
            err?.errors?.[0]?.message ||
            err?.message ||
            "Failed to send verification email";
          console.log("📧 Email preparation error:", prepareError);
          return { success: false, error: errorMsg };
        }
      }

      if (result?.status === "missing_requirements") {
        // Email verification required
        return { success: false, needsVerification: true };
      } else if (result?.status === "complete") {
        return { success: true };
      } else {
        return { success: false, error: "Sign up failed. Please try again." };
      }
    } catch (error: unknown) {
      const err = error as EmailAuthError;
      const errorMessage =
        err?.errors?.[0]?.message || err?.message || "Sign up failed";
      console.log("📧 Email sign up error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingStrategy(null);
    }
  };

  // Email Verification
  const handleVerifyEmail = async (
    code: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!signUp) {
      return { success: false, error: "Sign up not available" };
    }

    try {
      setLoadingStrategy("email_verify");
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result?.status === "complete") {
        // Email verified, now complete the signup and set the session
        try {
          if (result.createdSessionId && setActiveSignUp) {
            await setActiveSignUp({ session: result.createdSessionId });
            console.log(
              "📧 Email verification completed and session activated",
            );
            return { success: true };
          }
        } catch (sessionError) {
          console.log("📧 Session setup error:", sessionError);
          return { success: false, error: "Failed to activate session" };
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: "Verification failed. Please try again.",
        };
      }
    } catch (error: unknown) {
      const err = error as EmailAuthError;
      const errorMessage =
        err?.errors?.[0]?.message || err?.message || "Invalid or expired code";
      console.log("📧 Email verification error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingStrategy(null);
    }
  };

  // Resend verification email
  const handleResendVerificationEmail = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!signUp) {
      return { success: false, error: "Sign up not available" };
    }

    try {
      setLoadingStrategy("email_resend");
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      return { success: true };
    } catch (error: unknown) {
      const err = error as EmailAuthError;
      const errorMessage =
        err?.errors?.[0]?.message || err?.message || "Failed to resend code";
      console.log("📧 Resend verification error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingStrategy(null);
    }
  };

  // Handle Password Reset with Session Activation
  const handlePasswordReset = async (
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!signIn) {
      return { success: false, error: "Sign in not available" };
    }

    try {
      setLoadingStrategy("password_reset");
      const result = await signIn.resetPassword({ password });

      if (result?.status === "complete") {
        // Activate the session after password reset
        if (result.createdSessionId && setActiveSignIn) {
          try {
            await setActiveSignIn({ session: result.createdSessionId });
            console.log("📧 Password reset completed and session activated");
          } catch (sessionError) {
            console.log("📧 Session activation error:", sessionError);
            return { success: false, error: "Failed to activate session" };
          }
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: "Password reset failed. Please try again.",
        };
      }
    } catch (error: unknown) {
      const err = error as EmailAuthError;
      const errorMessage =
        err?.errors?.[0]?.message || err?.message || "Failed to reset password";
      console.log("📧 Password reset error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingStrategy(null);
    }
  };

  return {
    handleSocialAuth,
    handleEmailSignIn,
    handleEmailSignUp,
    handleVerifyEmail,
    handleResendVerificationEmail,
    handlePasswordReset,
    loadingStrategy,
  };
};

export default useSocialAuth;
