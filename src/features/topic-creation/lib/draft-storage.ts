import {
  DEFAULT_TOPIC_FORMAT,
  EMPTY_TOPIC_DRAFT,
  EMPTY_TOPIC_DRAFT_FIELDS,
  TOPIC_FORMAT_META,
} from "@/features/topic-creation/constants";
import { isPostIntent, isPostTopic } from "@/constants/post-taxonomy";
import type { TopicDraft, TopicDraftFields, TopicFormat } from "@/features/topic-creation/types";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

const TOPIC_DRAFT_STORAGE_KEY = "psy-prototype:create-topic:draft";
const TOPIC_DRAFT_RESTORE_REQUEST_KEY =
  "psy-prototype:create-topic:draft-restore-request";

function stripHtmlToText(content: string) {
  if (!content.trim()) {
    return "";
  }

  if (typeof window !== "undefined") {
    const document = new DOMParser().parseFromString(content, "text/html");
    return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeStoredFormat(value: unknown, fallbackIntent?: unknown): TopicFormat {
  if (
    value === "opinions"
    || value === "specialists"
    || value === "vent"
    || value === "demo-consultation"
  ) {
    return value;
  }

  if (fallbackIntent === "support") {
    return "demo-consultation";
  }

  return DEFAULT_TOPIC_FORMAT;
}

function normalizeStoredIntent(value: unknown, format: TopicFormat): PostIntent {
  if (value === "experience") {
    return "discussion";
  }

  if (isPostIntent(value)) {
    return value;
  }

  return TOPIC_FORMAT_META[format].legacyIntent;
}

function normalizeStoredFields(
  value: unknown,
  fallback: {
    content?: string;
    title?: string;
  },
): TopicDraftFields {
  if (value && typeof value === "object") {
    const candidate = value as Partial<Record<keyof TopicDraftFields, unknown>>;

    return {
      primary: typeof candidate.primary === "string" ? candidate.primary : "",
      secondary: typeof candidate.secondary === "string" ? candidate.secondary : "",
      tertiary: typeof candidate.tertiary === "string" ? candidate.tertiary : "",
    };
  }

  return {
    primary: fallback.title?.trim() ?? "",
    secondary: fallback.content ? stripHtmlToText(fallback.content) : "",
    tertiary: "",
  };
}

function buildDraftTitle(fields: TopicDraftFields) {
  return fields.primary.trim();
}

function buildDraftContent(fields: TopicDraftFields) {
  return [fields.secondary, fields.tertiary]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function createEmptyTopicDraft(): TopicDraft {
  return {
    ...EMPTY_TOPIC_DRAFT,
    fields: { ...EMPTY_TOPIC_DRAFT_FIELDS },
  };
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

export function hasMeaningfulTopicDraft(
  draft:
    | Pick<TopicDraft, "fields">
    | Pick<TopicDraft, "content" | "title">,
) {
  if ("fields" in draft) {
    return Object.values(draft.fields).some((value) => value.trim().length > 0);
  }

  return draft.title.trim().length > 0 || draft.content.trim().length > 0;
}

export function serializeTopicSnapshot(
  draft:
    | Pick<TopicDraft, "fields" | "format" | "guestEmail" | "topic">
    | Pick<TopicDraft, "content" | "intent" | "title" | "topic">,
) {
  if ("fields" in draft) {
    return JSON.stringify({
      fields: draft.fields,
      format: draft.format,
      guestEmail: draft.guestEmail,
      topic: draft.topic,
    });
  }

  return JSON.stringify({
    content: draft.content,
    intent: draft.intent,
    topic: draft.topic,
    title: draft.title,
  });
}

export function normalizeTopicDraft(
  draft: Partial<TopicDraft> & {
    content?: string;
    fields?: TopicDraftFields;
    format?: TopicFormat;
    intent?: PostIntent;
    title?: string;
  },
): TopicDraft {
  const format = normalizeStoredFormat(draft.format, draft.intent);
  const fields = normalizeStoredFields(draft.fields, {
    content: draft.content,
    title: draft.title,
  });
  const intent = normalizeStoredIntent(draft.intent, format);
  const title = buildDraftTitle(fields);
  const content = buildDraftContent(fields);

  return {
    content,
    editingPostId: typeof draft.editingPostId === "string" ? draft.editingPostId : null,
    fields,
    format,
    guestEmail: typeof draft.guestEmail === "string" ? draft.guestEmail : "",
    intent,
    topic: draft.topic ?? "free-topic",
    title,
    updatedAt: draft.updatedAt ?? null,
  };
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

    if (!parsedDraft || typeof parsedDraft !== "object") {
      return null;
    }

    const draftRecord = parsedDraft as Record<string, unknown>;
    const topic =
      "topic" in draftRecord && isPostTopic(draftRecord.topic)
        ? draftRecord.topic
        : "free-topic";
    const updatedAt =
      typeof draftRecord.updatedAt === "string" ? draftRecord.updatedAt : null;

    return normalizeTopicDraft({
      content: typeof draftRecord.content === "string" ? draftRecord.content : "",
      editingPostId:
        typeof draftRecord.editingPostId === "string" ? draftRecord.editingPostId : null,
      fields: "fields" in draftRecord
        ? (draftRecord.fields as TopicDraftFields)
        : undefined,
      format: "format" in draftRecord
        ? (draftRecord.format as TopicFormat)
        : undefined,
      guestEmail: typeof draftRecord.guestEmail === "string" ? draftRecord.guestEmail : "",
      intent: "intent" in draftRecord
        ? (draftRecord.intent as PostIntent)
        : undefined,
      title: typeof draftRecord.title === "string" ? draftRecord.title : "",
      topic,
      updatedAt,
    });
  } catch {
    return null;
  }
}

export function saveTopicDraft(
  draft: Partial<TopicDraft> & {
    content?: string;
    fields?: TopicDraftFields;
    format?: TopicFormat;
    guestEmail?: string;
    intent?: PostIntent;
    topic?: PostTopic | null;
    title?: string;
  },
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedDraft = normalizeTopicDraft(draft);

  window.localStorage.setItem(TOPIC_DRAFT_STORAGE_KEY, JSON.stringify(normalizedDraft));
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
