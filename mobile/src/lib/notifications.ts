export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Dynamic import to avoid loading in Expo Go
    const NotificationsModule = await import("expo-notifications");
    const { Platform } = await import("react-native");
    
    // Check if running on Expo Go or if functions are available
    if (!NotificationsModule?.setNotificationHandler) {
      console.log("Push notifications not available (running on Expo Go). Use a development build for full notification support.");
      return null;
    }

    // Configure notification handler
    NotificationsModule.setNotificationHandler({
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
      await NotificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
      const { status } = await NotificationsModule.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permissions not granted");
      return null;
    }

    // Get Expo push token
    const tokenData = await NotificationsModule.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Failed to setup push notifications:", error);
    return null;
  }
}

export async function addNotificationReceivedListener(
  listener: (notification: any) => void,
) {
  try {
    const NotificationsModule = await import("expo-notifications");
    
    if (!NotificationsModule?.addNotificationReceivedListener) {
      console.log("Notification listeners not available on this platform");
      return null;
    }
    
    return NotificationsModule.addNotificationReceivedListener(listener);
  } catch (error) {
    console.error("Failed to add notification listener:", error);
    return null;
  }
}

export async function addNotificationResponseReceivedListener(
  listener: (response: any) => void,
) {
  try {
    const NotificationsModule = await import("expo-notifications");
    
    if (!NotificationsModule?.addNotificationResponseReceivedListener) {
      console.log("Notification response listeners not available on this platform");
      return null;
    }
    
    return NotificationsModule.addNotificationResponseReceivedListener(listener);
  } catch (error) {
    console.error("Failed to add notification response listener:", error);
    return null;
  }
}
