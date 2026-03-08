import { Request, Response } from "express";
import { searchClerkUsers } from "../lib/clerk.js";
import { prisma } from "../lib/prisma.js";

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
              ...(profile?.username ? { username: profile.username } : {}),
              ...(profile?.avatar ? { avatar: profile.avatar } : {}),
            },
            create: {
              clerkId: candidateId,
              username: profile?.username ?? null,
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

    res.json(hydratedUsers);
    return;
  }

  res.json(users);
}
