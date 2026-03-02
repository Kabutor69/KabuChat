import { Text, View, StyleSheet, Pressable } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function HomeScreen() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) {
    return <Redirect href={"/(auth)"} />;
  }
  return (
    <View style={styles.container}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-foreground mb-4">
          Welcome to KabuChat
        </Text>
        <Text className="text-foreground-muted text-base text-center px-6">
          You are now signed in and ready to chat!
        </Text>
      </View>

      <Pressable
        onPress={() => signOut()}
        className="mb-10 bg-red-500 px-6 py-3 rounded-full self-center"
      >
        <Text className="text-white font-semibold text-base">Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
