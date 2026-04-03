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
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <SafeAreaView className="items-center">
          <View className="w-16 h-16 rounded-3xl bg-primary/10 items-center justify-center mb-6">
            <ActivityIndicator size="large" color="#208AEF" />
          </View>
          <Text className="text-xl font-bold text-foreground dark:text-foreground-dark">
            Authenticating...
          </Text>
          <Text className="text-foreground-muted dark:text-foreground-muted-dark mt-2">
            Just a moment while we set things up
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
