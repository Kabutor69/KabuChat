import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

import conversationRoutes from "./routes/conversation.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";

import { authMiddlewareSocket } from "./middleware/auth.middleware.js"; // we’ll create this

import { prisma } from "./lib/prisma.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "exp://192.168.1.64:8081" }, // replace "*" with your frontend URL in production
});

app.use(express.json());
app.use(cors());

// ----------------- REST API -----------------
app.use("/users", userRoutes);
app.use("/friends", friendRoutes);
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);

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
    const userId = socket.data.userId;

    // Save message in DB
    const message = await prisma.message.create({
      data: { content, senderId: userId, conversationId },
      include: { sender: true },
    });

    // Emit to everyone in the conversation
    io.to(conversationId).emit("newMessage", message);
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
