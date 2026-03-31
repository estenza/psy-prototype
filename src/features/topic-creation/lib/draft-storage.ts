import {
  DEFAULT_TOPIC_INTENT,
  EMPTY_TOPIC_DRAFT,
} from "@/features/topic-creation/constants";
import { isPostIntent, isPostTopic } from "@/constants/post-taxonomy";
import type { TopicDraft } from "@/features/topic-creation/types";
import type { PostIntent } from "@/types/post-taxonomy";

const TOPIC_DRAFT_STORAGE_KEY = "psy-prototype:create-topic:draft";
const TOPIC_DRAFT_RESTORE_REQUEST_KEY =
  "psy-prototype:create-topic:draft-restore-request";

function normalizeStoredIntent(value: unknown): PostIntent {
  if (value === "experience") {
    return "discussion";
  }

  return isPostIntent(value) ? value : DEFAULT_TOPIC_INTENT;
}

export function createEmptyTopicDraft(): TopicDraft {
  return { ...EMPTY_TOPIC_DRAFT };
}

export function getTopicContentTextLength(content: string) {
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}

export function hasTopicBodyContent(content: string) {
  return (
    getTopicContentTextLength(content) > 0 ||
    /<img[\s>]|data-embedded-media=/i.test(content)
  );
}

export function hasMeaningfulTopicDraft(draft: Pick<TopicDraft, "content" | "title">) {
  return draft.title.trim().length > 0 || hasTopicBodyContent(draft.content);
}

export function serializeTopicSnapshot(
  draft: Pick<TopicDraft, "content" | "intent" | "title" | "topic">,
) {
  return JSON.stringify({
    content: draft.content,
    intent: draft.intent,
    topic: draft.topic,
    title: draft.title,
  });
}

export function readStoredTopicDraft(): TopicDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(TOPIC_DRAFT_STORAGE_KEY);

    if (!rawDraft) {
      return null;
    }

    const parsedDraft: unknown = JSON.parse(rawDraft);

    if (
      !parsedDraft ||
      typeof parsedDraft !== "object" ||
      !("content" in parsedDraft) ||
      !("title" in parsedDraft)
    ) {
      return null;
    }

    const content =
      typeof parsedDraft.content === "string" ? parsedDraft.content : "";
    const title = typeof parsedDraft.title === "string" ? parsedDraft.title : "";
    const intentSource =
      "intent" in parsedDraft
        ? parsedDraft.intent
        : "format" in parsedDraft
          ? parsedDraft.format
          : undefined;
    const intent = normalizeStoredIntent(intentSource);
    const topic =
      "topic" in parsedDraft && isPostTopic(parsedDraft.topic)
        ? parsedDraft.topic
        : null;
    const updatedAt =
      "updatedAt" in parsedDraft && typeof parsedDraft.updatedAt === "string"
        ? parsedDraft.updatedAt
        : null;
    const editingPostId =
      "editingPostId" in parsedDraft &&
      typeof parsedDraft.editingPostId === "string"
        ? parsedDraft.editingPostId
        : null;

    return {
      content,
      editingPostId,
      intent,
      topic,
      title,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveTopicDraft(draft: TopicDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOPIC_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearTopicDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOPIC_DRAFT_STORAGE_KEY);
}

export function requestTopicDraftRestore() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(TOPIC_DRAFT_RESTORE_REQUEST_KEY, "1");
}

export function consumeTopicDraftRestoreRequest() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasPendingRestore = window.sessionStorage.getItem(
    TOPIC_DRAFT_RESTORE_REQUEST_KEY,
  );

  if (!hasPendingRestore) {
    return false;
  }

  window.sessionStorage.removeItem(TOPIC_DRAFT_RESTORE_REQUEST_KEY);

  return true;
}

export function formatDraftTimeLabel(updatedAt: string | null) {
  if (!updatedAt) {
    return "Автосохранение включено";
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Черновик сохранён";
  }

  return `Сохранено в ${date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function getInitialTopicSnapshot() {
  return serializeTopicSnapshot(createEmptyTopicDraft());
}
