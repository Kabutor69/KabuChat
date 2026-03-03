import { KabuTheme } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import type { UserResource } from "@clerk/types";
import { useEffect, useRef } from "react";
import { Chat, OverlayProvider, useCreateChatClient } from "stream-chat-expo";
import { FullScreenLoader } from "./FullScreenLoader";

import * as Sentry from "@sentry/react-native";

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

const syncUserToStream = async (user: UserResource) => {
  try {
    await fetch("/api/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        name: user.fullName ?? user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
        image: user.imageUrl,
      }),
    });
  } catch (error) {
    console.error("Failed to syn user to Stream", error);
  }
};

const ChatClient = ({ children, user }: { children: React.ReactNode; user: UserResource }) => {
  const syncedRef = useRef(false);

  useEffect(() => {
    // Run only once to avoid duplicate sync
    if (!syncedRef.current) {
      syncedRef.current = true;
      syncUserToStream(user);
    }
  }, [user]);

  const tokenProvider = async () => {
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      return data.token;
    } catch (error) {
      Sentry.logger.error("Failed to get Stream chat token", {
        userId: user.id,
        message: error instanceof Error ? error.message : String(error),
      });
      Sentry.captureException(error, { extra: { userId: user.id, hook: "tokenProvider" } });
    }
  };

  const chatClient = useCreateChatClient({
    apiKey: STREAM_API_KEY,
    userData: {
      id: user.id,
      name: user.fullName ?? user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
      image: user.imageUrl,
    },
    tokenOrProvider: tokenProvider,
  });

  if (!chatClient) return <FullScreenLoader message="Loading chat..." />;

  return (
    <OverlayProvider value={{ style: KabuTheme }}>
      <Chat client={chatClient} style={KabuTheme}>
        {children}
      </Chat>
    </OverlayProvider>
  );
};

const ChatWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <FullScreenLoader message="Loading chat..." />;

  if (!user) return <>{children}</>;

  return <ChatClient user={user}>{children}</ChatClient>;
};
export default ChatWrapper;

