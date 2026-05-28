import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { registerForPushNotifications, addNotificationReceivedListener, addNotificationResponseReceivedListener } from "@/lib/notifications";
import { registerPushToken, removePushToken } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@clerk/clerk-expo";

export const useNotifications = () => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const notificationListenersRef = useRef<Array<any>>([]);
  const registeredTokenRef = useRef<string | null>(null);

  // Setup push notifications
  useEffect(() => {
    if (!isSignedIn) return;

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // Register for push notifications
        const token = await registerForPushNotifications();
        if (token && isMounted) {
          registeredTokenRef.current = token;
          await registerPushToken(token);
          console.log("Push token registered:", token);
        }

        // Handle notification tap
        const responseListener = await addNotificationResponseReceivedListener((response) => {
          if (!isMounted) return;

          const data = response.notification.request.content.data;
          console.log("Notification tapped:", data);

          if (data.type === "message" && data.conversationId) {
            router.push(`/chat/${data.conversationId}` as any);
          } else if (data.type === "friendRequest") {
            router.push("/(modals)/friend-requests");
          }
        });

        if (isMounted) {
          notificationListenersRef.current.push(responseListener);
        }
      } catch (error) {
        console.error("Failed to setup notifications:", error);
      }
    };

    void setupNotifications();

    return () => {
      isMounted = false;
      notificationListenersRef.current.forEach((listener) => {
        if (listener && listener.remove) {
          listener.remove();
        }
      });
    };
  }, [isSignedIn, router]);

  // Listen for socket notifications
  useEffect(() => {
    if (!isSignedIn) return;

    const setupSocketNotifications = async () => {
      try {
        const Notifications = await import("expo-notifications");
        const socket = getSocket();

        if (!socket) return;

        // New message event
        const handleNewMessage = async (message: any) => {
          console.log("New message received:", message);
          
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: message.sender?.username || "New Message",
                body: message.content || "You have a new message",
                data: {
                  type: "message",
                  conversationId: message.conversationId,
                  messageId: message.id,
                },
                sound: true,
                badge: 1,
              },
              trigger: null, // Show immediately
            });
          } catch (error) {
            console.error("Failed to schedule message notification:", error);
          }
        };

        // Friend request event
        const handleFriendRequest = async (request: any) => {
          console.log("Friend request received:", request);
          
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Friend Request",
                body: `${request.sender?.username || "Someone"} sent you a friend request`,
                data: {
                  type: "friendRequest",
                  requestId: request.id,
                },
                sound: true,
                badge: 1,
              },
              trigger: null, // Show immediately
            });
          } catch (error) {
            console.error("Failed to schedule friend request notification:", error);
          }
        };

        socket.on("newMessage", handleNewMessage);
        // Listen for friend requests (both event names)
        socket.on("friendRequestReceived", handleFriendRequest);
        socket.on("newFriendRequest", handleFriendRequest);

        return () => {
          socket.off("newMessage", handleNewMessage);
          socket.off("friendRequestReceived", handleFriendRequest);
          socket.off("newFriendRequest", handleFriendRequest);
        };
      } catch (error) {
        console.error("Failed to setup socket notifications:", error);
      }
    };

    const cleanup = setupSocketNotifications();
    return () => {
      cleanup.then((c) => c?.());
    };
  }, [isSignedIn]);

  // Remove token on signout
  useEffect(() => {
    if (isSignedIn === false && registeredTokenRef.current) {
      removePushToken(registeredTokenRef.current).catch((error) => {
        console.error("Failed to remove push token:", error);
      });
      registeredTokenRef.current = null;
    }
  }, [isSignedIn]);
};
