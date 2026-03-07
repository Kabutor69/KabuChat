import { io, Socket } from "socket.io-client";

// Get Clerk auth token
async function getAuthToken(): Promise<string> {
  // This should be implemented with your Clerk setup
  // For now, returning placeholder
  return "";
}

let socket: Socket | null = null;

// Initialize socket connection
export async function initSocket(conversationId: string): Promise<Socket> {
  const token = await getAuthToken(); // get Clerk auth token

  // Create socket connection with token
  socket = io("http://192.168.1.64:5000", {
    auth: { token },
  });

  // Join a conversation room
  socket.emit("joinRoom", conversationId);

  // Listen for new messages
  socket.on("newMessage", (message) => {
    console.log("New message received:", message);
    // Update your chat UI here
  });

  return socket;
}

// Send a message
export function sendMessage(conversationId: string, content: string) {
  if (!socket) return;
  socket.emit("sendMessage", { conversationId, content });
}

// Disconnect socket
export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
