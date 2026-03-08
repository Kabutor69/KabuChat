import { verifyToken } from "@clerk/backend";
import { NextFunction, Request, Response } from "express";
import { Socket } from "socket.io";
import { getClerkUserProfile } from "../lib/clerk.js";
import { prisma } from "../lib/prisma.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function extractBearerToken(value: string | string[] | undefined) {
  const headerValue = Array.isArray(value) ? value[0] : value;
  if (!headerValue) return null;

  const [scheme, token] = headerValue.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;

  return token.trim() || null;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown authentication error";
}

async function ensureUserExists(clerkId: string) {
  const profile = await getClerkUserProfile(clerkId);

  const updateData: { username?: string; avatar?: string } = {};
  if (profile?.username) updateData.username = profile.username;
  if (profile?.avatar) updateData.avatar = profile.avatar;

  await prisma.user.upsert({
    where: { clerkId },
    update: updateData,
    create: {
      clerkId,
      username: profile?.username ?? null,
      avatar: profile?.avatar ?? null,
    },
  });
}

// Express middleware
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });

    if (!verifiedToken.sub) {
      throw new Error("Invalid token subject");
    }

    await ensureUserExists(verifiedToken.sub);

    req.userId = verifiedToken.sub;

    next();
  } catch (err) {
    console.warn(`Auth error: ${getErrorMessage(err)}`);
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Socket.io middleware
export async function authMiddlewareSocket(
  socket: Socket,
  next: (err?: any) => void,
) {
  const token =
    typeof socket.handshake.auth.token === "string"
      ? socket.handshake.auth.token
      : null;

  if (!token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });

    if (!verifiedToken.sub) {
      throw new Error("Invalid token subject");
    }

    await ensureUserExists(verifiedToken.sub);

    socket.data.userId = verifiedToken.sub;

    next();
  } catch (err) {
    console.warn(`Socket auth error: ${getErrorMessage(err)}`);
    next(new Error("Unauthorized"));
  }
}
