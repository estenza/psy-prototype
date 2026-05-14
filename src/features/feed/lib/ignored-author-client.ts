"use client";

import { toast } from "@/components/feedback/toast";
import type { Post } from "@/features/feed/types";

type RouteErrorResponse = {
  error?: string;
};

export function getPostAuthorHandle(post: Post) {
  return post.author.handle.startsWith("@")
    ? post.author.handle
    : `@${post.author.handle}`;
}

export function filterPostsByIgnoredAuthor(posts: Post[], ignoredUserId: string) {
  return posts.filter((post) => post.author.id !== ignoredUserId);
}

async function readRouteError(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as RouteErrorResponse | null;
  return payload?.error ?? fallbackMessage;
}

export async function requestIgnoreAuthor(ignoredUserId: string) {
  const response = await fetch("/api/ignored-authors", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ignoredUserId }),
  });

  if (!response.ok) {
    throw new Error(await readRouteError(response, "Не удалось обновить игнор-лист."));
  }
}

export async function requestUnignoreAuthor(ignoredUserId: string) {
  const response = await fetch("/api/ignored-authors", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ignoredUserId }),
  });

  if (!response.ok) {
    throw new Error(await readRouteError(response, "Не удалось обновить игнор-лист."));
  }
}

export function showIgnoredAuthorToast(params: {
  authorHandle: string;
  ignoredUserId: string;
}) {
  let toastId = "";

  toastId = toast(`Вы игнорируете ${params.authorHandle}`, {
    timeout: 3000,
    actionProps: {
      children: "Отменить",
      onPress: () => {
        toast.close(toastId);
        void requestUnignoreAuthor(params.ignoredUserId).catch((error: unknown) => {
          const message = error instanceof Error
            ? error.message
            : "Не удалось обновить игнор-лист.";
          toast.danger(message);
        });
      },
    },
  });
}
