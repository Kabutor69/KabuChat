import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// sso router
export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const { created_session_id, rotating_token_nonce } = useLocalSearchParams();

  // session activate going
  const isActivatingSession = !!(created_session_id || rotating_token_nonce);

  if (!isLoaded || (isActivatingSession && !isSignedIn)) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-[28px] bg-primary/10 dark:bg-primary/20 items-center justify-center mb-6 border border-primary/20">
            <ActivityIndicator size="large" color="#5B4AFF" />
          </View>
          <Text className="text-2xl font-extrabold text-foreground dark:text-foreground-dark text-center">
            Authenticating...
          </Text>
          <Text className="text-foreground-muted dark:text-foreground-muted-dark mt-2 text-center text-sm leading-relaxed px-4">
            Just a moment while we secure and establish your session.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  // yoz signnin then go tabs
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  // if nut auth
  return <Redirect href="/(auth)" />;
}
