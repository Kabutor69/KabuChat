import { prisma } from "./prisma.js";

export const messageInclude = {
  sender: {
    select: {
      id: true,
      clerkId: true,
      username: true,
      avatar: true,
    },
  },
  reads: {
    include: {
      user: {
        select: {
          clerkId: true,
        },
      },
    },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      isDeleted: true,
      sender: {
        select: {
          clerkId: true,
          username: true,
        },
      },
    },
  },
} as const;

export function toSocketPayload(message: any) {
  return {
    id: message.id,
    content: message.isDeleted ? "" : message.content,
    createdAt: message.createdAt,
    isDeleted: message.isDeleted,
    isEdited: message.isEdited,
    sender: message.sender,
    readByClerkIds: message.reads.map((read: any) => read.user.clerkId),
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.isDeleted ? "" : message.replyTo.content,
          isDeleted: message.replyTo.isDeleted,
          sender: message.replyTo.sender,
        }
      : null,
  };
}
