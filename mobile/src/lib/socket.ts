import { io, Socket } from "socket.io-client";
import NetInfo from '@react-native-community/netinfo';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

let authTokenGetter: (() => Promise<string | null>) | null = null;
let socket: Socket | null = null;

export function configureSocketAuth(getToken: () => Promise<string | null>) {
  authTokenGetter = getToken;
}

export async function connectSocket(): Promise<Socket | null> {
  if (socket?.connected) {
    return socket;
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.log("Socket skipped: Offline");
    return null;
  }

  const token = authTokenGetter ? await authTokenGetter() : null;

  if (!token) {
    throw new Error("No auth token available");
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
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
