import "server-only";

import {
  createPost,
  deletePost,
  setPostBookmark,
  setPostLike,
  setPostProfileFavorite,
  updatePost,
} from "@/features/feed/lib/posts-repository";
import type { SessionUser } from "@/features/auth/types";
import type { PostMutationPayload } from "@/features/feed/types";

export function publishPost(actor: SessionUser, payload: PostMutationPayload) {
  return createPost({
    author: actor,
    content: payload.content,
    intent: payload.intent,
    subtopic: payload.subtopic,
    title: payload.title,
    topic: payload.topic,
  });
}

export function revisePost(
  actor: SessionUser,
  postId: string,
  payload: PostMutationPayload,
) {
  return updatePost(postId, {
    author: actor,
    content: payload.content,
    intent: payload.intent,
    subtopic: payload.subtopic,
    title: payload.title,
    topic: payload.topic,
  });
}

export function removePost(actor: SessionUser, postId: string) {
  return deletePost(postId, actor);
}

export function togglePostLike(params: {
  actor: SessionUser;
  liked: boolean;
  postId: string;
}) {
  return setPostLike(params);
}

export function togglePostBookmark(params: {
  actor: SessionUser;
  bookmarked: boolean;
  postId: string;
}) {
  return setPostBookmark(params);
}

export function togglePostProfileFavorite(params: {
  actor: SessionUser;
  favorited: boolean;
  postId: string;
}) {
  return setPostProfileFavorite(params);
}
