// Load environment variables BEFORE any imports
require("dotenv").config();

import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

import conversationRoutes from "./routes/conversation.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import messageRoutes from "./routes/message.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userRoutes from "./routes/user.routes.js";

import { authMiddlewareSocket } from "./middleware/auth.middleware.js"; // we’ll create this

import { prisma } from "./lib/prisma.js";

const app = express();
const server = http.createServer(app);

if (!process.env.CLERK_SECRET_KEY) {
  console.warn("Missing CLERK_SECRET_KEY in backend environment.");
}

if (!process.env.CLERK_JWT_KEY) {
  console.warn(
    "Missing CLERK_JWT_KEY in backend environment. Token verification may fail with jwk-failed-to-resolve.",
  );
}

const io = new Server(server, {
  cors: {
    origin: ["exp://192.168.1.66:8081", "http://192.168.1.66:8081"],
    credentials: true,
  },
});

app.use(express.json());
app.use(
  cors({
    origin: true, // Allow all origins in development
    credentials: true,
  }),
);

// ----------------- REST API -----------------
app.use("/users", userRoutes);
app.use("/friends", friendRoutes);
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);
app.use("/notifications", notificationRoutes);

// ----------------- SOCKET.IO -----------------
io.use(authMiddlewareSocket); // attach Clerk auth to sockets

io.on("connection", (socket) => {
  console.log("User connected:", socket.data.userId);

  // Join conversation room
  socket.on("joinRoom", (conversationId: string) => {
    socket.join(conversationId);
    console.log(`${socket.data.userId} joined room ${conversationId}`);
  });

  // Send message
  socket.on("sendMessage", async (data) => {
    const { conversationId, content } = data;
    const clerkId = socket.data.userId;

    try {
      // Get user by clerkId
      const user = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      // Save message in DB
      const message = await prisma.message.create({
        data: { content, senderId: user.id, conversationId },
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
      });

      // Emit to everyone in the conversation
      io.to(conversationId).emit("newMessage", message);
    } catch (error) {
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.data.userId);
  });
});

// ----------------- Start Server -----------------
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `Server also accessible on local network at http://192.168.x.x:${PORT}`,
  );
});
