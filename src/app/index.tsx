import { Text, View, StyleSheet, Pressable } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function Index() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) {
    return <Redirect href={"/(auth)"} />;
  }
  return (
    <View style={styles.container}>
      <Text className="text-lg text-red-500">
        Edit src/app/index.tsx to edit this screen.
      </Text>
      <Pressable
        onPress={() => signOut()}
        className="absolute bottom-10 bg-red-500 px-4 py-2 rounded"
      >
        <Text className="text-white font-semibold">Sign Out</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
