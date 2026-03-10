import { Request, Response } from "express";
import { getClerkUserProfile } from "../lib/clerk.js";
import { prisma } from "../lib/prisma.js";

export async function sendFriendRequest(req: Request, res: Response) {
  const senderClerkId = req.userId;
  const { receiverClerkId } = req.body;

  if (!senderClerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!receiverClerkId || typeof receiverClerkId !== "string") {
    return res.status(400).json({ error: "receiverClerkId is required" });
  }

  if (receiverClerkId.trim().length === 0) {
    return res.status(400).json({ error: "receiverClerkId cannot be empty" });
  }

  if (receiverClerkId === senderClerkId) {
    return res.status(400).json({ error: "Cannot send request to yourself" });
  }

  try {
    const sender = await prisma.user.findUnique({
      where: { clerkId: senderClerkId },
    });

    const receiver = await prisma.user.findUnique({
      where: { clerkId: receiverClerkId },
    });

    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    const alreadyFriends = await prisma.friend.findFirst({
      where: {
        OR: [
          { userAId: sender.id, userBId: receiver.id },
          { userAId: receiver.id, userBId: sender.id },
        ],
      },
    });

    if (alreadyFriends) {
      return res.status(409).json({ error: "Already friends" });
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          {
            senderId: sender.id,
            receiverId: receiver.id,
            status: "pending",
          },
          {
            senderId: receiver.id,
            receiverId: sender.id,
            status: "pending",
          },
        ],
      },
    });

    if (existingRequest) {
      return res.status(409).json({ error: "Friend request already pending" });
    }

    const request = await prisma.friendRequest.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
      },
    });

    res.json(request);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
}

export async function acceptFriendRequest(req: Request, res: Response) {
  const clerkId = req.userId;
  const { requestId } = req.body;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return res.status(404).json({ error: "Friend request not found" });
  }

  if (request.receiverId !== user.id) {
    return res
      .status(403)
      .json({ error: "Not allowed to accept this request" });
  }

  const updatedRequest = await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "accepted" },
  });

  const friendship = await prisma.friend.create({
    data: {
      userAId: request.senderId,
      userBId: request.receiverId,
    },
  });

  res.json({ request: updatedRequest, friendship });
}

export async function getFriends(req: Request, res: Response) {
  const clerkId = req.userId;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
    orderBy: { createdAt: "desc" },
  });

  const friendUserIds = friends.map((friend) =>
    friend.userAId === user.id ? friend.userBId : friend.userAId,
  );

  const friendUsers = await prisma.user.findMany({
    where: {
      id: { in: friendUserIds },
    },
    select: {
      id: true,
      clerkId: true,
      username: true,
      avatar: true,
    },
  });

  const enriched = await Promise.all(
    friendUsers.map(async (friend) => {
      if (friend.username) return friend;
      const profile = await getClerkUserProfile(friend.clerkId);
      if (profile?.name) {
        await prisma.user.update({
          where: { clerkId: friend.clerkId },
          data: { username: profile.name },
        });
        return { ...friend, username: profile.name };
      }
      return friend;
    }),
  );

  res.json(enriched);
}

export async function getPendingRequests(req: Request, res: Response) {
  const clerkId = req.userId;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const requests = await prisma.friendRequest.findMany({
    where: {
      receiverId: user.id,
      status: "pending",
    },
    include: {
      sender: {
        select: {
          id: true,
          clerkId: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(requests);
}

export async function rejectFriendRequest(req: Request, res: Response) {
  const clerkId = req.userId;
  const { requestId } = req.body;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return res.status(404).json({ error: "Friend request not found" });
  }

  if (request.receiverId !== user.id) {
    return res
      .status(403)
      .json({ error: "Not allowed to reject this request" });
  }

  const updatedRequest = await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "rejected" },
  });

  res.json(updatedRequest);
}

export async function cancelFriendRequest(req: Request, res: Response) {
  const senderClerkId = req.userId;
  const { receiverClerkId } = req.body;

  if (!senderClerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!receiverClerkId) {
    return res.status(400).json({ error: "receiverClerkId is required" });
  }

  const sender = await prisma.user.findUnique({ where: { clerkId: senderClerkId } });
  const receiver = await prisma.user.findUnique({ where: { clerkId: receiverClerkId } });

  if (!sender || !receiver) {
    return res.status(404).json({ error: "User not found" });
  }

  const request = await prisma.friendRequest.findFirst({
    where: {
      senderId: sender.id,
      receiverId: receiver.id,
      status: "pending",
    },
  });

  if (!request) {
    return res.status(404).json({ error: "Pending friend request not found" });
  }

  await prisma.friendRequest.delete({
    where: { id: request.id },
  });

  res.json({ success: true, message: "Friend request cancelled" });
}

export async function removeFriend(req: Request, res: Response) {
  const clerkId = req.userId;
  const { friendClerkId } = req.body;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!friendClerkId) {
    return res.status(400).json({ error: "friendClerkId is required" });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  const friend = await prisma.user.findUnique({ where: { clerkId: friendClerkId } });

  if (!user || !friend) {
    return res.status(404).json({ error: "User not found" });
  }

  const friendship = await prisma.friend.findFirst({
    where: {
      OR: [
        { userAId: user.id, userBId: friend.id },
        { userAId: friend.id, userBId: user.id },
      ],
    },
  });

  if (!friendship) {
    return res.status(404).json({ error: "Friendship not found" });
  }

  await prisma.friend.delete({
    where: { id: friendship.id },
  });

  res.json({ success: true, message: "Friend removed" });
}
