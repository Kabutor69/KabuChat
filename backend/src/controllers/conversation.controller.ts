import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function createDMConversation(req: Request, res: Response) {
  const clerkId = req.userId;
  const { friendClerkId } = req.body;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!friendClerkId || typeof friendClerkId !== "string") {
    return res.status(400).json({ error: "friendClerkId is required" });
  }

  if (friendClerkId.trim().length === 0) {
    return res.status(400).json({ error: "friendClerkId cannot be empty" });
  }

  if (friendClerkId === clerkId) {
    return res
      .status(400)
      .json({ error: "Cannot create conversation with yourself" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    const friend = await prisma.user.findUnique({
      where: { clerkId: friendClerkId },
    });

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: friend.id } } },
        ],
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { clerkId: true } },
            reads: { include: { user: { select: { clerkId: true } } } },
          },
        },
      },
    });

    if (existing) {
      return res.json({
        id: existing.id,
        isGroup: existing.isGroup,
        name: existing.name,
        members: existing.members.map((member) => ({
          id: member.user.id,
          clerkId: member.user.clerkId,
          name: member.user.username ?? member.user.clerkId,
          avatar: member.user.avatar,
        })),
        lastMessage: existing.messages[0]
          ? {
              content: existing.messages[0].content,
              createdAt: existing.messages[0].createdAt,
              sender: { clerkId: existing.messages[0].sender.clerkId },
              readByClerkIds: existing.messages[0].reads.map((r: any) => r.user.clerkId),
            }
          : null,
      });
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [{ userId: user.id }, { userId: friend.id }],
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json({
      id: conversation.id,
      isGroup: conversation.isGroup,
      name: conversation.name,
      members: conversation.members.map((member) => ({
        id: member.user.id,
        clerkId: member.user.clerkId,
        name: member.user.username ?? member.user.clerkId,
        avatar: member.user.avatar,
      })),
      lastMessage: null,
    });
  } catch (error) {
    console.error("Error creating DM conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
}

export async function getUserConversations(req: Request, res: Response) {
  const clerkId = req.userId;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: { select: { clerkId: true } },
            reads: { include: { user: { select: { clerkId: true } } } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(
      conversations.map((conversation) => ({
        id: conversation.id,
        isGroup: conversation.isGroup,
        name: conversation.name,
        members: conversation.members.map((member) => ({
          id: member.user.id,
          clerkId: member.user.clerkId,
          name: member.user.username ?? member.user.clerkId,
          avatar: member.user.avatar,
        })),
        lastMessage: conversation.messages[0]
          ? {
              content: conversation.messages[0].content,
              createdAt: conversation.messages[0].createdAt,
              sender: { clerkId: conversation.messages[0].sender.clerkId },
              readByClerkIds: conversation.messages[0].reads.map((r: any) => r.user.clerkId),
            }
          : null,
      })),
    );
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
}
