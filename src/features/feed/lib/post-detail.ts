import type { Post } from "@/features/feed/types";

export const POST_BODY_MAX_LENGTH = 1500;

function clampPostBody(text: string) {
  if (text.length <= POST_BODY_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, POST_BODY_MAX_LENGTH - 1).trimEnd()}…`;
}

function normalizeRichTextContent(content: string) {
  if (typeof window !== "undefined") {
    const parsedContent = new window.DOMParser().parseFromString(content, "text/html");

    return parsedContent.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function getPostBodyText(post: Post) {
  const storedBody = post.editorState?.content
    ? normalizeRichTextContent(post.editorState.content)
    : "";

  return clampPostBody(storedBody || post.content.excerpt);
}
