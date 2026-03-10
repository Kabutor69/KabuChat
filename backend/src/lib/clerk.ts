import { createClerkClient } from "@clerk/backend";
import { prisma } from "./prisma.js";

type UserProfile = {
  name: string | null;
  avatar: string | null;
};

type SearchUserProfile = UserProfile & {
  clerkId: string;
};

const secretKey = process.env.CLERK_SECRET_KEY;

export const clerkClient = secretKey
  ? createClerkClient({
    secretKey,
  })
  : null;

function toProfile(clerkUser: {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}): UserProfile {
  // Prefer Clerk @username handle, fall back to full name from first+last
  const name = clerkUser.username?.trim()
    ? clerkUser.username.trim()
    : [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join("")
      .trim() || null;

  return {
    name,
    avatar: clerkUser.imageUrl ?? null,
  };
}

/**
 * Slugify a display name into a lowercase alphanumeric+underscore string.
 * e.g. "Kabutor lol" -> "kabutor_lol"
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")   // non-alphanumeric -> underscore
    .replace(/_+/g, "_")            // collapse multiple underscores
    .replace(/^_|_$/g, "")         // trim leading/trailing underscores
    .slice(0, 16);                  // leave room for suffix
}

/**
 * Generate a unique username from a base display name.
 * e.g. "Kabutor lol" -> "kabutor_lol_1"
 */
export async function generateUniqueUsername(baseName: string): Promise<string> {
  const slug = slugify(baseName) || "user";

  const exactMatch = await prisma.user.findFirst({
    where: { username: slug },
    select: { id: true },
  });

  if (!exactMatch) return slug;

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(Math.random() * 9999) + 1;
    const candidate = `${slug}_${suffix}`;

    const existing = await prisma.user.findFirst({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  // Ultra-rare fallback: use timestamp
  return `${slug}_${Date.now().toString().slice(-6)}`;
}

export async function getClerkUserProfile(
  clerkId: string,
): Promise<UserProfile | null> {
  if (!clerkClient) return null;

  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    return toProfile(clerkUser);
  } catch {
    return null;
  }
}

export async function searchClerkUsers(
  query: string,
  limit = 20,
): Promise<SearchUserProfile[]> {
  if (!clerkClient) return [];

  try {
    const result = await clerkClient.users.getUserList({
      query,
      limit,
    });

    return result.data.map((user) => ({
      clerkId: user.id,
      ...toProfile(user),
    }));
  } catch {
    return [];
  }
}
