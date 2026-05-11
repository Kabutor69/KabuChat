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

import { authMiddlewareSocket } from "./middleware/auth.middleware.js";

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

const socketCorsOrigins = (process.env.SOCKET_CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const resolvedSocketOrigins =
  socketCorsOrigins.length > 0
    ? socketCorsOrigins
    : true;

const io = new Server(server, {
  cors: {
    origin: resolvedSocketOrigins,
    credentials: true,
  },
});

app.set("io", io);

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// ----------------- REST API -----------------
// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/users", userRoutes);
app.use("/friends", friendRoutes);
app.use("/conversations", conversationRoutes);
app.use("/messages", messageRoutes);
app.use("/notifications", notificationRoutes);

// ----------------- SOCKET.IO -----------------
io.use(authMiddlewareSocket); // attach Clerk auth to sockets


import { registerChatHandlers } from "./socket.js";

io.on("connection", (socket) => {
  console.log("User connected:", socket.data.userId);

  // Register chat event handlers
  registerChatHandlers(io, socket);
});


// ----------------- Start Server -----------------
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `Server also accessible on local network at http://192.168.x.x:${PORT}`,
  );
});
