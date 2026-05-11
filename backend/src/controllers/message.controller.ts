import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { messageInclude, toSocketPayload } from "../lib/message.helpers.js";

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.userId;
    const { conversationId, content, replyToId } = req.body;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!conversationId || !content) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "Message content cannot be empty" });
      return;
    }

    if (content.length > 5000) {
      res
        .status(400)
        .json({ error: "Message content too long (max 5000 characters)" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if user is a participant in the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!conversation) {
      res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
      return;
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

    const payload = toSocketPayload(message);

    // Emit to socket room if io is available
    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("newMessage", {
        ...payload,
        conversationId,
      });
    }

    res.json(payload);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.userId;
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: "Missing conversationId" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if user is a participant in the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!conversation) {
      res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(messages.map(toSocketPayload));
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}

export async function markConversationAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.userId;
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: "Missing conversationId" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!conversation) {
      res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
      return;
    }

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        reads: {
          none: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (unreadMessages.length === 0) {
      res.json({ count: 0, messageIds: [] });
      return;
    }

    await prisma.messageRead.createMany({
      data: unreadMessages.map((message) => ({
        messageId: message.id,
        userId: user.id,
      })),
      skipDuplicates: true,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("messagesRead", {
        conversationId,
        readerClerkId: clerkId,
        messageIds: unreadMessages.map((message) => message.id),
      });
    }

    res.json({
      count: unreadMessages.length,
      messageIds: unreadMessages.map((message) => message.id),
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
}

export async function deleteMessage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.userId;
    const messageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!messageId) {
      res.status(400).json({ error: "Missing messageId" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (message.senderId !== user.id) {
      res.status(403).json({ error: "You can only delete your own messages" });
      return;
    }

    if (message.isDeleted) {
      res.status(400).json({ error: "Message already deleted" });
      return;
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId).emit("messageDeleted", {
        messageId: updated.id,
        conversationId: message.conversationId,
      });
    }

    res.json({ success: true, messageId: updated.id });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
}

export async function editMessage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clerkId = req.userId;
    const messageId = Array.isArray(req.params.messageId)
      ? req.params.messageId[0]
      : req.params.messageId;
    const { content } = req.body;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!messageId) {
      res.status(400).json({ error: "Missing messageId" });
      return;
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "Message content cannot be empty" });
      return;
    }

    if (content.length > 5000) {
      res.status(400).json({ error: "Message content too long (max 5000 characters)" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (message.senderId !== user.id) {
      res.status(403).json({ error: "You can only edit your own messages" });
      return;
    }

    if (message.isDeleted) {
      res.status(400).json({ error: "Cannot edit a deleted message" });
      return;
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: true,
        reads: {
          include: {
            user: {
              select: {
                clerkId: true,
              },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            isDeleted: true,
            sender: {
              select: {
                clerkId: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const payload = toSocketPayload(updated);

    // Emit to socket room
    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId).emit("messageEdited", {
        ...payload,
        conversationId: message.conversationId,
      });
    }

    res.json(payload);
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
}
