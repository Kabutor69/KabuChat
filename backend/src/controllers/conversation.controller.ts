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

    const isFriend = !!(await prisma.friend.findFirst({
      where: {
        OR: [
          { userAId: user.id, userBId: friend.id },
          { userAId: friend.id, userBId: user.id },
        ],
      },
    }));

    if (existing) {
      return res.json({
        id: existing.id,
        isGroup: existing.isGroup,
        isFriend,
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
      isFriend,
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

    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
    });
    
    const friendMap = new Map<string, Date>();
    friends.forEach((friend) => {
      const peerId = friend.userAId === user.id ? friend.userBId : friend.userAId;
      friendMap.set(peerId, friend.createdAt);
    });

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

    const existingDMs = conversations.filter((c) => !c.isGroup);
    const existingPeerIds = new Set(
      existingDMs.map((c) => c.members.find((m) => m.userId !== user.id)?.userId)
    );

    const missingFriendIds = Array.from(friendMap.keys()).filter((id) => id && !existingPeerIds.has(id));

    for (const friendId of missingFriendIds) {
      if (!friendId) continue;
      const newConv = await prisma.conversation.create({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: user.id }, { userId: friendId }],
          },
        },
        include: {
          members: { include: { user: true } },
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
      conversations.push(newConv as any);
    }

    res.json(
      conversations.map((conversation) => {
        let isFriend = true;
        let activeAt = conversation.createdAt.toISOString();
        
        if (!conversation.isGroup) {
          const peer = conversation.members.find((m) => m.userId !== user.id);
          if (peer) {
            isFriend = friendMap.has(peer.userId);
            const friendCreatedAt = friendMap.get(peer.userId);
            const lastMessageAt = conversation.messages[0]?.createdAt;
            
            let activeDate = conversation.createdAt;
            if (lastMessageAt && friendCreatedAt) {
              activeDate = lastMessageAt > friendCreatedAt ? lastMessageAt : friendCreatedAt;
            } else if (lastMessageAt) {
              activeDate = lastMessageAt;
            } else if (friendCreatedAt) {
              activeDate = friendCreatedAt;
            }
            activeAt = activeDate.toISOString();
          }
        } else {
           const lastMsgAt = conversation.messages[0]?.createdAt;
           if (lastMsgAt) {
              activeAt = lastMsgAt.toISOString();
           }
        }

        return {
          id: conversation.id,
          isGroup: conversation.isGroup,
          isFriend,
          activeAt,
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
        };
      }),
    );
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
}
