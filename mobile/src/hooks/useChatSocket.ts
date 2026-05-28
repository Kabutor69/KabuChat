import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { connectSocket, getSocket } from "../lib/socket";
import { getMessages, markConversationAsRead, type ChatMessage } from "../lib/api";

import { cacheGet, cacheSet, outboxGet, outboxRemove } from "../lib/cache";

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
      const cached = cacheGet<ChatMessage[]>(`messages_${conversationId}`);
      
      // Merge outbox messages with cached messages for offline view
      let messagesToShow = cached || [];
      const outboxMessages = outboxGet();
      const relevantOutbox = outboxMessages.filter(m => m.conversationId === conversationId);
      
      if (relevantOutbox.length > 0 && userId) {
        const cachedIds = new Set(messagesToShow.map(m => m.id));
        const outboxAsMessages = relevantOutbox.map(msg => ({
          id: msg.id,
          content: msg.content,
          createdAt: new Date(msg.createdAt).toISOString(),
          sender: { 
            id: userId, 
            clerkId: userId, 
            username: cacheGet<any>("profile_me")?.username || "You" 
          },
          readByClerkIds: [],
        } as ChatMessage));
        
        // Filter out duplicates and combine
        messagesToShow = [
          ...messagesToShow.filter(m => !m.id.startsWith("outbox_")),
          ...outboxAsMessages.filter(m => !cachedIds.has(m.id))
        ];
      }
      
      if (messagesToShow.length > 0) {
        setMessages(messagesToShow);
      }
      
      const data = await getMessages(conversationId);
      setMessages(data);
      cacheSet(`messages_${conversationId}`, data);
    } catch (error) {
      console.error("Failed to load messages", error);
      const cached = cacheGet<ChatMessage[]>(`messages_${conversationId}`);
      const outboxMessages = outboxGet();
      const relevantOutbox = outboxMessages.filter(m => m.conversationId === conversationId);
      
      let messagesToShow = cached || [];
      if (relevantOutbox.length > 0 && userId) {
        const cachedIds = new Set(messagesToShow.map(m => m.id));
        const outboxAsMessages = relevantOutbox.map(msg => ({
          id: msg.id,
          content: msg.content,
          createdAt: new Date(msg.createdAt).toISOString(),
          sender: { 
            id: userId, 
            clerkId: userId, 
            username: cacheGet<any>("profile_me")?.username || "You" 
          },
          readByClerkIds: [],
        } as ChatMessage));
        messagesToShow = [
          ...messagesToShow.filter(m => !m.id.startsWith("outbox_")),
          ...outboxAsMessages.filter(m => !cachedIds.has(m.id))
        ];
      }
      if (messagesToShow.length > 0) {
        setMessages(messagesToShow);
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.log("Failed to mark messages as read", error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    let socket: any = null;

    const setupSocket = async () => {
      try {
        await loadMessages();

        if (!userId) {
          setSocketConnected(false);
          return;
        }

        socket = await connectSocket();
        if (socket) {
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
            
            // Sync outbox
            const outboxMessages = outboxGet();
            if (outboxMessages && outboxMessages.length > 0) {
              outboxMessages.forEach((msg) => {
                if (msg.conversationId === conversationId) {
                  socket.emit("sendMessage", {
                    conversationId: msg.conversationId,
                    content: msg.content,
                    ...(msg.replyToId ? { replyToId: msg.replyToId } : {}),
                  });
                  outboxRemove(msg.id);
                  // Optionally, we could remove the optimistic message from UI here, 
                  // but we'll let the server response 'newMessage' append the real one,
                  // and we might end up with a duplicate momentarily unless we filter it.
                  // For simplicity, we just filter out optimistic ids locally.
                  setMessages(prev => prev.filter(m => m.id !== msg.id));
                }
              });
            }
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
        }
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
