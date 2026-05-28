import { prisma } from "./prisma.js";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

export interface PushNotificationPayload {
  to: string[];
  sound: "default";
  title: string;
  body: string;
  data: Record<string, string>;
}

/**
 * Send push notifications via Expo Push Service
 * Requires EXPO_ACCESS_TOKEN in environment
 */
export async function sendPushNotifications(payload: PushNotificationPayload) {
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.warn("EXPO_ACCESS_TOKEN not set - push notifications disabled");
    return;
  }

  if (!payload.to || payload.to.length === 0) {
    console.log("No push tokens provided");
    return;
  }

  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Expo push notification error:", error);
    } else {
      const result = await response.json();
      console.log("Push notifications sent:", result);
    }
  } catch (error) {
    console.error("Failed to send push notifications:", error);
  }
}

/**
 * Get all push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  } catch (error) {
    console.error("Failed to get user push tokens:", error);
    return [];
  }
}

/**
 * Notify user of a new message
 */
export async function notifyNewMessage(
  recipientUserId: string,
  senderUsername: string,
  messageContent: string,
  conversationId: string,
) {
  const tokens = await getUserPushTokens(recipientUserId);
  if (tokens.length === 0) return;

  await sendPushNotifications({
    to: tokens,
    sound: "default",
    title: senderUsername || "New Message",
    body: messageContent || "You have a new message",
    data: {
      type: "message",
      conversationId,
    },
  });
}

/**
 * Notify user of a friend request
 */
export async function notifyFriendRequest(
  recipientUserId: string,
  senderUsername: string,
  requestId: string,
) {
  const tokens = await getUserPushTokens(recipientUserId);
  if (tokens.length === 0) return;

  await sendPushNotifications({
    to: tokens,
    sound: "default",
    title: "Friend Request",
    body: `${senderUsername || "Someone"} sent you a friend request`,
    data: {
      type: "friendRequest",
      requestId,
    },
  });
}
