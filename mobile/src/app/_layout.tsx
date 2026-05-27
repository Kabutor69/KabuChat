import { ThemeProvider, useThemePreference } from "@/contexts/theme.context";
import { configureApiAuth } from "@/lib/api";
import { configureSocketAuth } from "@/lib/socket";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import * as Sentry from "@sentry/react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StartupSplash } from "../components/StartupSplash";
import { OfflineBanner } from "@/components/OfflineBanner";
import { cacheGet, cacheSet } from "@/lib/cache";
import NetInfo from "@react-native-community/netinfo";
import "../../global.css";

Sentry.init({
  dsn: "https://4c4d41b9975fb19e214a3a089027782b@o4510967284236288.ingest.de.sentry.io/4510978737307728",
  sendDefaultPii: true,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],
});

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <ThemeProvider>
        <AuthHandler />
      </ThemeProvider>
    </ClerkProvider>
  );
}

function AuthHandler() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const prevIsSignedIn = useRef<boolean | undefined>(undefined);

  // Track network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Configure API/socket auth
  useEffect(() => {
    configureApiAuth(() => getToken());
    configureSocketAuth(() => getToken());
  }, [getToken]);

  // Only write true to cache when confirmed signed in
  useEffect(() => {
    if (isSignedIn === true) {
      cacheSet('wasSignedIn', true);
    }
  }, [isSignedIn]);

  // Only clear cache on explicit sign out: true → false while loaded + online
  // Never clears on cold start: undefined → false
  useEffect(() => {
    if (
      prevIsSignedIn.current === true &&
      isSignedIn === false &&
      isLoaded === true
    ) {
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          cacheSet('wasSignedIn', false);
          console.log("CACHE: cleared wasSignedIn on sign out");
        }
      });
    }

    if (isSignedIn !== undefined) {
      prevIsSignedIn.current = isSignedIn;
    }
  }, [isSignedIn, isLoaded]);

  // Ready
  useEffect(() => {
    const wasSignedIn = cacheGet<boolean>('wasSignedIn');
    console.log("READY CHECK:", { isLoaded, isSignedIn, wasSignedIn });

    if (isLoaded) {
      console.log("READY: Clerk loaded");
      setIsReady(true);
      return;
    }

    if (wasSignedIn === true) {
      console.log("READY: wasSignedIn=true from cache, skipping Clerk wait");
      setIsReady(true);
      return;
    }

    console.log("READY: waiting for Clerk or 5s timeout...");
    const timer = setTimeout(() => {
      console.log("READY: 5s timeout fired");
      setIsReady(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Routing 
  useEffect(() => {
    if (!isReady) return;
    if (hasRedirected.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const wasSignedIn = cacheGet<boolean>('wasSignedIn');
    const isOfflineOrUnknown = isConnected === false || isConnected === null;

    // Online → trust Clerk
    // Offline/unknown → trust SQLite cache
    const isActuallySignedIn = !isOfflineOrUnknown
      ? !!isSignedIn
      : !!wasSignedIn;

    console.log("ROUTING:", {
      isSignedIn,
      isLoaded,
      isConnected,
      isOfflineOrUnknown,
      wasSignedIn,
      isActuallySignedIn,
      inAuthGroup,
    });

    if (!isActuallySignedIn && !inAuthGroup) {
      console.log("ROUTING: → (auth)");
      hasRedirected.current = true;
      setTimeout(() => router.replace('/(auth)'), 100);
    } else if (isActuallySignedIn && inAuthGroup) {
      console.log("ROUTING: → (tabs)");
      hasRedirected.current = true;
      setTimeout(() => router.replace('/(tabs)'), 100);
    } else {
      console.log("ROUTING: already in right place");
    }
  }, [isReady, isSignedIn, isLoaded, isConnected, segments, router]);

  // Reset redirect lock only on genuine auth state change
  // NOT on cold start undefined → false
  useEffect(() => {
    if (
      prevIsSignedIn.current !== undefined &&
      isSignedIn !== undefined &&
      prevIsSignedIn.current !== isSignedIn
    ) {
      console.log("REDIRECT LOCK RESET: isSignedIn changed from", prevIsSignedIn.current, "to", isSignedIn);
      hasRedirected.current = false;
    }
  }, [isSignedIn]);

  if (!isReady) {
    return <StartupSplash message="Loading Kabuchat..." />;
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
