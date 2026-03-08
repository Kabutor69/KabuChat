import { createClerkClient } from "@clerk/backend";

type UserProfile = {
  username: string | null;
  avatar: string | null;
};

type SearchUserProfile = UserProfile & {
  clerkId: string;
};

const secretKey = process.env.CLERK_SECRET_KEY;

const clerkClient = secretKey
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
  const username = clerkUser.username?.trim()
    ? clerkUser.username.trim()
    : [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null;

  return {
    username,
    avatar: clerkUser.imageUrl ?? null,
  };
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
