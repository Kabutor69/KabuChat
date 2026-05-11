import { Server, Socket } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { messageInclude, toSocketPayload } from "./lib/message.helpers.js";

// Register all chat-related socket event handlers for a connected socket.
export function registerChatHandlers(io: Server, socket: Socket) {
  const clerkId = socket.data.userId as string;

  // Join room
  socket.on("joinRoom", (conversationId: string) => {
    socket.join(conversationId);
    console.log(`${clerkId} joined room ${conversationId}`);
  });

  // Send message
  socket.on("sendMessage", async (data) => {
    const { conversationId, content, replyToId } = data;

    try {
      if (!conversationId || !content) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      if (typeof content !== "string" || content.trim().length === 0) {
        socket.emit("error", { message: "Message content cannot be empty" });
        return;
      }

      if (content.length > 5000) {
        socket.emit("error", { message: "Message content too long" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { members: true },
      });

      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      // DM friend-check
      if (!conversation.isGroup) {
        const peerItem = conversation.members.find((m) => m.userId !== user.id);
        if (peerItem) {
          const isFriend = await prisma.friend.findFirst({
            where: {
              OR: [
                { userAId: user.id, userBId: peerItem.userId },
                { userAId: peerItem.userId, userBId: user.id },
              ],
            },
          });

          if (!isFriend) {
            socket.emit("error", {
              message: "You are no longer friends and cannot send messages.",
            });
            return;
          }
        }
      }

      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: user.id,
          conversationId,
          ...(replyToId ? { replyToId } : {}),
        },
        include: messageInclude,
      });

      io.to(conversationId).emit("newMessage", {
        ...toSocketPayload(message),
        conversationId,
      });
    } catch (error) {
      console.error("Error sending message via socket:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Delete message (soft delete)
  socket.on("deleteMessage", async (data) => {
    const { messageId } = data;

    try {
      if (!messageId) {
        socket.emit("error", { message: "Missing messageId" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      if (message.senderId !== user.id) {
        socket.emit("error", { message: "You can only delete your own messages" });
        return;
      }

      if (message.isDeleted) {
        socket.emit("error", { message: "Message already deleted" });
        return;
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      io.to(message.conversationId).emit("messageDeleted", {
        messageId,
        conversationId: message.conversationId,
      });
    } catch (error) {
      console.error("Error deleting message via socket:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // Edit message
  socket.on("editMessage", async (data) => {
    const { messageId, content } = data;

    try {
      if (!messageId || !content) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      if (typeof content !== "string" || content.trim().length === 0) {
        socket.emit("error", { message: "Message content cannot be empty" });
        return;
      }

      if (content.length > 5000) {
        socket.emit("error", { message: "Message content too long" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      if (message.senderId !== user.id) {
        socket.emit("error", { message: "You can only edit your own messages" });
        return;
      }

      if (message.isDeleted) {
        socket.emit("error", { message: "Cannot edit a deleted message" });
        return;
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: content.trim(),
          isEdited: true,
          editedAt: new Date(),
        },
        include: messageInclude,
      });

      io.to(message.conversationId).emit("messageEdited", {
        ...toSocketPayload(updated),
        conversationId: message.conversationId,
      });
    } catch (error) {
      console.error("Error editing message via socket:", error);
      socket.emit("error", { message: "Failed to edit message" });
    }
  });

  // ── Typing indicators ──
  socket.on("typingStart", (conversationId: string) => {
    if (!conversationId) return;
    socket.to(conversationId).emit("typing", {
      conversationId,
      clerkId,
      isTyping: true,
    });
  });

  socket.on("typingStop", (conversationId: string) => {
    if (!conversationId) return;
    socket.to(conversationId).emit("typing", {
      conversationId,
      clerkId,
      isTyping: false,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", clerkId);
  });
}
