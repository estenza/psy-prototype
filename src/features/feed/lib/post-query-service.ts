import "server-only";

import {
  FEED_PAGE_SIZE,
  findPostById,
  incrementPostViews,
  listBookmarkedPostsByUserId,
  listPostsPage,
  listPostsByAuthorUserId,
  listProfileFavoritePostsByUserId,
} from "@/features/feed/lib/posts-repository";
import type { SessionUser } from "@/features/auth/types";
import type { PostTopic } from "@/types/post-taxonomy";

export const DEFAULT_FEED_PAGE_SIZE = FEED_PAGE_SIZE;

export type FeedPostsQuery = {
  cursor?: string | null;
  limit?: number;
  topic?: string | null;
};

export function listFeedPosts(
  viewer: SessionUser | null,
  query: FeedPostsQuery = {},
) {
  return listPostsPage(viewer, {
    cursor: query.cursor,
    limit: query.limit,
    topic: query.topic as PostTopic | "all" | null | undefined,
  });
}

export function getPostForViewer(postId: string, viewer: SessionUser | null) {
  return findPostById(postId, viewer);
}

export async function registerPostView(
  postId: string,
  viewer: SessionUser | null,
) {
  if (!viewer) {
    return;
  }

  await incrementPostViews(postId);
}

export function listAuthorProfilePosts(
  authorUserId: string,
  viewer: SessionUser | null,
) {
  return listPostsByAuthorUserId(authorUserId, viewer);
}

export function listAuthorProfileFavoritePosts(
  authorUserId: string,
  viewer: SessionUser | null,
) {
  return listProfileFavoritePostsByUserId(authorUserId, viewer);
}

export function listViewerBookmarkedPosts(viewer: SessionUser) {
  return listBookmarkedPostsByUserId(viewer.id, viewer);
}
