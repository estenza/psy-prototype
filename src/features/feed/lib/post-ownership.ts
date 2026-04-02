import type { SessionUser } from "@/features/auth/types";
import type { Post } from "@/features/feed/types";

export function isPostOwnedByUser(
  post: Post | null | undefined,
  currentUser: SessionUser | null,
) {
  return Boolean(post && currentUser && post.author.id && post.author.id === currentUser.id);
}
