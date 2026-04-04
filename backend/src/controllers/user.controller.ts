import { Request, Response } from "express";
import { getClerkUserProfile, searchClerkUsers } from "../lib/clerk.js";
import { prisma } from "../lib/prisma.js";

type SearchUserRow = {
  id: string;
  clerkId: string;
  username: string | null;
  avatar: string | null;
  createdAt: Date;
};

async function enrichSearchUsers(
  users: SearchUserRow[],
  currentUserId: string,
): Promise<(SearchUserRow & { relationshipStatus: "none" | "pending" | "friends", requestId?: string })[]> {
  const usersMissingName = users.filter((user) => !user.username);
  let updatedUsers = users;

  if (usersMissingName.length > 0) {
    const profileUpdates = await Promise.all(
      usersMissingName.map(async (user) => {
        const profile = await getClerkUserProfile(user.clerkId);
        if (!profile?.name && !profile?.avatar) return null;

        await prisma.user.update({
          where: { clerkId: user.clerkId },
          data: {
            ...(profile.name ? { username: profile.name } : {}),
            ...(profile.avatar ? { avatar: profile.avatar } : {}),
          },
        });

        return [user.clerkId, profile] as const;
      }),
    );

    const profileMap = new Map(
      profileUpdates.filter(
        (
          item,
        ): item is readonly [
          string,
          { name: string | null; avatar: string | null },
        ] => Boolean(item),
      ),
    );

    updatedUsers = users.map((user) => {
      const profile = profileMap.get(user.clerkId);
      if (!profile) return user;

      return {
        ...user,
        username: user.username ?? profile.name,
        avatar: user.avatar ?? profile.avatar,
      };
    });
  }

  // Find relationships
  const searchedUserIds = updatedUsers.map(u => u.id);

  const friendships = await prisma.friend.findMany({
    where: {
      OR: [
        { userAId: currentUserId, userBId: { in: searchedUserIds } },
        { userAId: { in: searchedUserIds }, userBId: currentUserId },
      ],
    },
  });

  const friendIds = new Set(
    friendships.flatMap(f => [f.userAId, f.userBId]).filter(id => id !== currentUserId)
  );

  const pendingRequests = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: { in: searchedUserIds }, status: "pending" },
        { senderId: { in: searchedUserIds }, receiverId: currentUserId, status: "pending" },
      ],
    },
  });

  const requestMap = new Map(
    pendingRequests.flatMap(r => [
      [r.senderId !== currentUserId ? r.senderId : r.receiverId, r]
    ])
  );

  return updatedUsers.map(user => {
    let status: "none" | "pending" | "friends" = "none";
    let requestId: string | undefined;

    if (friendIds.has(user.id)) {
      status = "friends";
    } else if (requestMap.has(user.id)) {
      status = "pending";
      requestId = requestMap.get(user.id)?.id;
    }

    return {
      ...user,
      relationshipStatus: status,
      ...(requestId ? { requestId } : {}),
    };
  });
}

export async function getMe(req: Request, res: Response) {
  const clerkId = req.userId;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { clerkId },
    });
  }

  res.json(user);
}

export async function searchUsers(req: Request, res: Response) {
  const clerkId = req.userId;
  const query = (req.query.q as string | undefined)?.trim() ?? "";

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (query.length < 2) {
    return res.json([]);
  }

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true }
  });

  if (!currentUser) return res.status(404).json({ error: "User not found" });

  const users = await prisma.user.findMany({
    where: {
      clerkId: { not: clerkId },
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { clerkId: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      clerkId: true,
      username: true,
      avatar: true,
      createdAt: true,
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  if (users.length < 20) {
    const clerkMatches = await searchClerkUsers(query, 20);
    const profileMap = new Map(
      clerkMatches.map((match) => [match.clerkId, match]),
    );
    const candidateClerkIds = Array.from(profileMap.keys()).filter(
      (candidateId) => candidateId !== clerkId,
    );

    if (candidateClerkIds.length > 0) {
      await prisma.$transaction(
        candidateClerkIds.map((candidateId) => {
          const profile = profileMap.get(candidateId);
          return prisma.user.upsert({
            where: { clerkId: candidateId },
            update: {
              ...(profile?.name ? { username: profile.name } : {}),
              ...(profile?.avatar ? { avatar: profile.avatar } : {}),
            },
            create: {
              clerkId: candidateId,
              username: profile?.name ?? null,
              avatar: profile?.avatar ?? null,
            },
          });
        }),
      );
    }

    const hydratedUsers = await prisma.user.findMany({
      where: {
        clerkId: { not: clerkId },
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { clerkId: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        clerkId: true,
        username: true,
        avatar: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    if (hydratedUsers.length > 0) {
      const enrichedHydratedUsers = await enrichSearchUsers(hydratedUsers, currentUser.id);
      res.json(enrichedHydratedUsers);
      return;
    }

    res.json([]);
    return;
  }

  const enrichedUsers = await enrichSearchUsers(users, currentUser.id);
  res.json(enrichedUsers);
}

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function validateUsername(username: string): string | null {
  if (!username || username.trim().length === 0) return "Username is required";
  const u = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(u))
    return "Username must be 3-20 characters: letters, numbers, underscores only";
  return null;
}

export async function checkUsernameAvailable(req: Request, res: Response) {
  const clerkId = req.userId;
  const query = ((req.query.q as string) ?? "").trim().toLowerCase();

  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const validationError = validateUsername(query);
  if (validationError) return res.status(400).json({ error: validationError });

  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });

  const existing = await prisma.user.findFirst({
    where: {
      username: query,
      ...(user ? { NOT: { id: user.id } } : {}),
    },
    select: { id: true },
  });

  res.json({ available: !existing });
}

export async function updateUsername(req: Request, res: Response) {
  const clerkId = req.userId;
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const raw = (req.body.username as string | undefined) ?? "";
  const username = raw.trim().toLowerCase();

  const validationError = validateUsername(username);
  if (validationError) return res.status(400).json({ error: validationError });

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!currentUser) return res.status(404).json({ error: "User not found" });

  // Check uniqueness against all other users
  const conflict = await prisma.user.findFirst({
    where: { username, NOT: { id: currentUser.id } },
    select: { id: true },
  });

  if (conflict) {
    return res.status(409).json({ error: "Username is already taken" });
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: { username },
    select: { username: true },
  });

  res.json({ username: updated.username });
}
