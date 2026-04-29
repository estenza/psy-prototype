import {
  clearTopicDraft,
  consumeTopicDraftRestoreRequest,
  readStoredTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";
import {
  markPublishedPostForHighlight,
  markPublishedPostToast,
} from "@/features/feed/lib/published-posts";
import type {
  PostMutationResponse,
  PostRouteErrorResponse,
} from "@/features/feed/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "";
  }

  return `<p>${escapeHtml(normalizedValue).replace(/\n/g, "<br />")}</p>`;
}

export async function publishStoredTopicDraftAfterAuth() {
  const draft = readStoredTopicDraft();

  if (!draft || !draft.title.trim()) {
    return null;
  }

  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: textToHtml(draft.content),
      intent: draft.intent,
      title: draft.title,
      topic: draft.topic,
    }),
  });
  const payload =
    (await response.json()) as PostMutationResponse | PostRouteErrorResponse;

  if (!response.ok) {
    const errorPayload = payload as PostRouteErrorResponse;

    throw new Error(errorPayload.error ?? "Не удалось опубликовать пост");
  }

  const successPayload = payload as PostMutationResponse;

  clearTopicDraft();
  consumeTopicDraftRestoreRequest();
  markPublishedPostForHighlight(successPayload.post.id);
  markPublishedPostToast("Пост опубликован");

  return successPayload.post;
}
