import { io, Socket } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

let authTokenGetter: (() => Promise<string | null>) | null = null;
let socket: Socket | null = null;

export function configureSocketAuth(getToken: () => Promise<string | null>) {
  authTokenGetter = getToken;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const token = authTokenGetter ? await authTokenGetter() : null;

  if (!token) {
    throw new Error("No auth token available");
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
