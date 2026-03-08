// NOTE: This file should ONLY be dynamically imported in development builds
// expo-notifications doesn't work in Expo Go (SDK 53+)
// Import this module only after checking it's available

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Dynamic import to avoid loading in Expo Go
    const Notifications = await import("expo-notifications");
    const { Platform } = await import("react-native");

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Check if running on a physical device (required for push notifications)
    if (Platform.OS === "web") {
      console.log("Push notifications not supported on web");
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permissions not granted");
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

export async function addNotificationReceivedListener(
  listener: (notification: any) => void,
) {
  const Notifications = await import("expo-notifications");
  return Notifications.addNotificationReceivedListener(listener);
}

export async function addNotificationResponseReceivedListener(
  listener: (response: any) => void,
) {
  const Notifications = await import("expo-notifications");
  return Notifications.addNotificationResponseReceivedListener(listener);
}
