import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { cacheGet } from "@/lib/cache";

export default function AuthRoutesLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const wasSignedIn = cacheGet<boolean>("wasSignedIn");

  if (isSignedIn || (!isLoaded && wasSignedIn === true)) {
    return <Redirect href={"/(tabs)"} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}