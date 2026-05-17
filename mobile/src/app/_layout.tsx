import { ThemeProvider, useThemePreference } from "@/contexts/theme.context";
import { configureApiAuth } from "@/lib/api";
import { configureSocketAuth } from "@/lib/socket";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import * as Sentry from "@sentry/react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { cacheGet, cacheSet } from "@/lib/cache";
import NetInfo from "@react-native-community/netinfo";
import "../../global.css";


Sentry.init({
  dsn: "https://4c4d41b9975fb19e214a3a089027782b@o4510967284236288.ingest.de.sentry.io/4510978737307728",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <ThemeProvider>
        <ApiAuthBridge />
        <AuthHandler />
      </ThemeProvider>
    </ClerkProvider>
  );
}

function AuthHandler() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setIsReady(true);
      return;
    }

    const timer = setTimeout(() => {
      console.log("Clerk isLoaded timeout, forcing ready");
      setIsReady(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    if (!isReady || isConnected === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Check local cache if clerk is offline
    const wasSignedIn = cacheGet<boolean>('wasSignedIn');

    // Signed in if Clerk confirms it, or if we were logged in before and are now offline.
    const isActuallySignedIn = !!isSignedIn || (!!wasSignedIn && (!isLoaded || isConnected === false));

    if (!isActuallySignedIn && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (isActuallySignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isReady, isSignedIn, isLoaded, isConnected, segments, router]);

  if (!isReady || isConnected === null) {
    return <FullScreenLoader message="Starting up..." />;
  }

  return <AppShell />;
}

function AppShell() {
  const { resolvedTheme } = useThemePreference();

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen
          name="(modals)"
          options={{ presentation: "modal" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

function ApiAuthBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    console.log("ApiAuthBridge: isSignedIn =", isSignedIn);
    configureApiAuth(() => getToken());
    configureSocketAuth(() => getToken());
    
    if (isSignedIn !== undefined) {
      NetInfo.fetch().then(state => {
        // Only overwrite the cache if we are online OR if the user successfully signs in
        if (state.isConnected || isSignedIn === true) {
          cacheSet('wasSignedIn', isSignedIn);
        }
      });
    }
  }, [getToken, isSignedIn]);

  // Push notifications disabled in Expo Go (SDK 53+)
  // To enable, build a development build with:
  // npx expo install expo-dev-client && eas build --profile development
  // useEffect(() => {
  //   if (!isSignedIn) return;
  //   const setupPushNotifications = async () => {
  //     try {
  //       const { registerForPushNotifications } = await import("@/lib/notifications");
  //       const token = await registerForPushNotifications();
  //       if (token) {
  //         await registerPushToken(token);
  //         console.log("Push token registered:", token);
  //       }
  //     } catch (error) {
  //       console.log("Push notifications not available:", error);
  //     }
  //   };
  //   setupPushNotifications();
  // }, [isSignedIn]);

  return null;
}
