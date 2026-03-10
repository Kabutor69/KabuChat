import { verifyToken } from "@clerk/backend";
import { NextFunction, Request, Response } from "express";
import { Socket } from "socket.io";
import { clerkClient, generateUniqueUsername, getClerkUserProfile } from "../lib/clerk.js";
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

  // Check if user already exists in DB
  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, username: true },
  });

  const updateData: { username?: string; avatar?: string } = {};
  if (profile?.name) updateData.username = profile.name;
  if (profile?.avatar) updateData.avatar = profile.avatar;

  if (existingUser) {
    // Only update if something changed
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { clerkId }, data: updateData });
    }
    return;
  }

  // New user — generate a unique username if Clerk has no username set
  let username = profile?.name ?? null;
  let didGenerateUsername = false;

  if (!username) {
    // Shouldn't happen often but be safe
    username = await generateUniqueUsername("user");
    didGenerateUsername = true;
  } else {
    // Check if this name is already taken; if so, make it unique
    const taken = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });
    if (taken) {
      username = await generateUniqueUsername(username);
      didGenerateUsername = true;
    }
  }

  await prisma.user.create({
    data: {
      clerkId,
      username,
      avatar: profile?.avatar ?? null,
    },
  });

  // Push the generated username back to Clerk so it's consistent across logins
  if (didGenerateUsername && clerkClient) {
    try {
      await clerkClient.users.updateUser(clerkId, { username });
    } catch (err) {
      console.warn(`Failed to update Clerk username for ${clerkId}:`, err);
    }
  }
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
