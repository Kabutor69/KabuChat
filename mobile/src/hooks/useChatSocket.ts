import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { connectSocket, getSocket } from "../lib/socket";
import { getMessages, markConversationAsRead, type ChatMessage } from "../lib/api";

export const useChatSocket = (conversationId: string | undefined, userId: string | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const socketHandlersRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.log("Failed to mark messages as read", error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !userId) return;

    let socket: any = null;

    const setupSocket = async () => {
      try {
        await loadMessages();
        socket = await connectSocket();
        setSocketConnected(true);
        socket.emit("joinRoom", conversationId);

        const handleNewMessage = (message: ChatMessage) => {
          setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) return prev;
            return [...prev, message];
          });
          if (message.sender.clerkId !== userId) void markRead();
        };

        const handleTyping = (payload: { conversationId: string; clerkId: string; isTyping: boolean }) => {
          if (payload.conversationId !== conversationId) return;
          if (payload.clerkId === userId) return;
          setIsPeerTyping(payload.isTyping);
        };

        const handleMessagesRead = (payload: { conversationId: string; readerClerkId: string; messageIds: string[] }) => {
          if (payload.conversationId !== conversationId) return;
          setMessages((prev) =>
            prev.map((message) => {
              if (!payload.messageIds.includes(message.id)) return message;
              const currentReadBy = message.readByClerkIds ?? [];
              if (currentReadBy.includes(payload.readerClerkId)) return message;
              return { ...message, readByClerkIds: [...currentReadBy, payload.readerClerkId] };
            })
          );
        };

        const handleMessageDeleted = (payload: { messageId: string; conversationId: string }) => {
          if (payload.conversationId !== conversationId) return;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.messageId ? { ...msg, isDeleted: true, content: "" } : msg))
          );
        };

        const handleMessageEdited = (payload: ChatMessage & { conversationId: string }) => {
          if (payload.conversationId !== conversationId) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.id
                ? { ...msg, content: payload.content, isEdited: payload.isEdited, replyTo: payload.replyTo }
                : msg
            )
          );
        };

        const handleConnect = () => {
          setSocketConnected(true);
          socket.emit("joinRoom", conversationId);
        };

        const handleDisconnect = () => setSocketConnected(false);
        const handleError = (payload: { message: string }) => Alert.alert("Error", payload.message || "Something went wrong.");

        socket.on("newMessage", handleNewMessage);
        socket.on("typing", handleTyping);
        socket.on("messagesRead", handleMessagesRead);
        socket.on("messageDeleted", handleMessageDeleted);
        socket.on("messageEdited", handleMessageEdited);
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("error", handleError);

        socketHandlersRef.current = {
          newMessage: handleNewMessage,
          typing: handleTyping,
          messagesRead: handleMessagesRead,
          messageDeleted: handleMessageDeleted,
          messageEdited: handleMessageEdited,
          connect: handleConnect,
          disconnect: handleDisconnect,
          error: handleError,
        };
      } catch (error) {
        console.error("Socket setup failed:", error);
        setSocketConnected(false);
      }
    };

    setupSocket();

    return () => {
      const handlers = socketHandlersRef.current;
      if (socket && handlers) {
        Object.keys(handlers).forEach((event) => socket.off(event, handlers[event]));
      }
    };
  }, [conversationId, userId, loadMessages, markRead]);

  return {
    messages,
    setMessages,
    loading,
    socketConnected,
    isPeerTyping,
    markRead,
  };
};
