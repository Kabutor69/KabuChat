import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

function toChatMessagePayload(message: {
  id: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    clerkId: string;
    username: string | null;
    avatar: string | null;
  };
  reads: {
    user: {
      clerkId: string;
    };
  }[];
}) {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    sender: message.sender,
    readByClerkIds: message.reads.map((read) => read.user.clerkId),
  };
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.userId;
    const { conversationId, content } = req.body;

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
      },
    });

    res.json(toChatMessagePayload(message));
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
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(messages.map(toChatMessagePayload));
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
