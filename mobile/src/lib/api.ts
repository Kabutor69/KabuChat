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
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function configureApiAuth(getToken: () => Promise<string | null>) {
  authTokenGetter = getToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authTokenGetter ? await authTokenGetter() : null;

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
