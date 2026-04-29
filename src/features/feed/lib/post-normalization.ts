import type { Post } from "@/features/feed/types";

export function normalizePostDates(post: Post): Post {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
  };
}

export function normalizePostsDates(posts: Post[]) {
  return posts.map(normalizePostDates);
}
