export interface Conversation {
  id: string;
  name?: string | null;
  isGroup?: boolean;
  members: {
    id: string;
    clerkId: string;
    name: string;
    avatar?: string | null;
  }[];
  lastMessage?: {
    content: string;
    createdAt: string;
  } | null;
}

export interface UserSearchItem {
  id: string;
  clerkId: string;
  username?: string | null;
  avatar?: string | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username?: string | null;
    clerkId: string;
  };
  readByClerkIds?: string[];
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  sender: {
    id: string;
    clerkId: string;
    username?: string | null;
    avatar?: string | null;
  };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function configureApiAuth(getToken: () => Promise<string | null>) {
  authTokenGetter = getToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authTokenGetter ? await authTokenGetter() : null;

  console.log(`API request to ${path}, token:`, token ? "present" : "missing");

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getConversations(): Promise<Conversation[]> {
  const raw = await request<
    Conversation[] | { conversations?: Conversation[] }
  >("/conversations");

  if (Array.isArray(raw)) return raw;
  return raw.conversations ?? [];
}

export async function getMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/messages/${conversationId}`);
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  return request<ChatMessage>("/messages/send", {
    method: "POST",
    body: JSON.stringify({ conversationId, content }),
  });
}

export async function markConversationAsRead(conversationId: string): Promise<{
  count: number;
  messageIds: string[];
}> {
  return request<{ count: number; messageIds: string[] }>(
    `/messages/${conversationId}/read`,
    {
      method: "POST",
    },
  );
}

export async function searchUsers(query: string): Promise<UserSearchItem[]> {
  const encoded = encodeURIComponent(query.trim());
  return request<UserSearchItem[]>(`/users/search?q=${encoded}`);
}

export async function sendFriendRequest(receiverClerkId: string) {
  return request<{ id: string }>("/friends/request", {
    method: "POST",
    body: JSON.stringify({ receiverClerkId }),
  });
}

export async function createDmConversation(friendClerkId: string) {
  return request<Conversation>("/conversations/dm", {
    method: "POST",
    body: JSON.stringify({ friendClerkId }),
  });
}

export async function getPendingFriendRequests(): Promise<FriendRequest[]> {
  return request<FriendRequest[]>("/friends/requests");
}

export async function acceptFriendRequest(requestId: string) {
  return request<{
    request: FriendRequest;
    friendship: { id: string; userAId: string; userBId: string };
  }>("/friends/accept", {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
}

export async function rejectFriendRequest(requestId: string) {
  return request<FriendRequest>("/friends/reject", {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
}

export async function getFriends(): Promise<UserSearchItem[]> {
  return request<UserSearchItem[]>("/friends");
}

export async function registerPushToken(token: string) {
  return request<{ id: string; userId: string; token: string }>(
    "/notifications/register",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
}

export async function removePushToken(token: string) {
  return request<{ message: string }>("/notifications/remove", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
