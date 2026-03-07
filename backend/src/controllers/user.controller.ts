import { Request, Response } from "express";
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

  res.json(users);
}
