import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function registerPushToken(req: Request, res: Response) {
  const clerkId = req.userId;
  const { token } = req.body;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if token already exists
    const existing = await prisma.pushToken.findUnique({
      where: { token },
    });

    if (existing) {
      if (existing.userId === user.id) {
        return res.json({ message: "Token already registered" });
      }
      // Token belongs to another user, delete it and re-register
      await prisma.pushToken.delete({
        where: { token },
      });
    }

    // Create new push token
    const pushToken = await prisma.pushToken.create({
      data: {
        userId: user.id,
        token,
      },
    });

    res.json(pushToken);
  } catch (error) {
    console.error("Failed to register push token:", error);
    res.status(500).json({ error: "Failed to register push token" });
  }
}

export async function removePushToken(req: Request, res: Response) {
  const clerkId = req.userId;
  const { token } = req.body;

  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.pushToken.deleteMany({
      where: {
        userId: user.id,
        token,
      },
    });

    res.json({ message: "Token removed" });
  } catch (error) {
    console.error("Failed to remove push token:", error);
    res.status(500).json({ error: "Failed to remove push token" });
  }
}
