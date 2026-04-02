import type { SessionUser } from "@/features/auth/types";
import { mapApiPostsToFeed } from "@/features/feed/lib/post-adapter";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import { mockApiPosts } from "@/features/feed/mocks/mock-api-posts";
import type { Post } from "@/features/feed/types";

export const DISCUSSION_BODY_MAX_LENGTH = 1500;

const STATIC_DISCUSSION_POSTS = mapApiPostsToFeed(mockApiPosts);
const STATIC_DISCUSSION_BODY_BY_ID = new Map(
  mockApiPosts.map((record) => [record.id, record.body.detail ?? record.body.excerpt]),
);

function clampDiscussionBody(text: string) {
  if (text.length <= DISCUSSION_BODY_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, DISCUSSION_BODY_MAX_LENGTH - 1).trimEnd()}…`;
}

function normalizeRichTextContent(content: string) {
  if (typeof window !== "undefined") {
    const parsedContent = new window.DOMParser().parseFromString(content, "text/html");

    return parsedContent.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function findStaticDiscussionPostById(postId: string) {
  return STATIC_DISCUSSION_POSTS.find((post) => post.id === postId) ?? null;
}

export function getDiscussionBodyText(post: Post, currentUser: SessionUser | null) {
  const authoredBody =
    isPostOwnedByUser(post, currentUser) && post.editorState?.content
      ? normalizeRichTextContent(post.editorState.content)
      : "";
  const fallbackBody = STATIC_DISCUSSION_BODY_BY_ID.get(post.id) ?? post.content.excerpt;

  return clampDiscussionBody(authoredBody || fallbackBody);
}
