import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

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
        content,
        senderId: user.id,
        conversationId,
      },
      include: {
        sender: true,
      },
    });

    res.json(message);
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
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}
