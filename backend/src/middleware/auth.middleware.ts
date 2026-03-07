import { verifyToken } from "@clerk/backend";
import { NextFunction, Request, Response } from "express";
import { Socket } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Express middleware
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("No token provided");

    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!verifiedToken.sub) {
      throw new Error("Invalid token subject");
    }

    req.userId = verifiedToken.sub;

    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Socket.io middleware
export async function authMiddlewareSocket(
  socket: Socket,
  next: (err?: any) => void,
) {
  try {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) throw new Error("No token provided");

    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!verifiedToken.sub) {
      throw new Error("Invalid token subject");
    }

    socket.data.userId = verifiedToken.sub;

    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
}
