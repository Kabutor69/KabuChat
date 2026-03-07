import { ThemeProvider, useThemePreference } from "@/contexts/theme.context";
import { configureApiAuth } from "@/lib/api";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
    <ClerkProvider tokenCache={tokenCache}>
      <ThemeProvider>
        <ApiAuthBridge />
        <AppShell />
      </ThemeProvider>
    </ClerkProvider>
  );
}

function AppShell() {
  const { resolvedTheme } = useThemePreference();

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[conversationId]" />
      </Stack>
    </GestureHandlerRootView>
  );
}

function ApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    configureApiAuth(() => getToken());
  }, [getToken]);

  return null;
}
