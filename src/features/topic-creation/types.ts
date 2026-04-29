import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

export type TopicFormat =
  | "opinions"
  | "specialists"
  | "vent"
  | "demo-consultation";

export type TopicFieldKey = "primary" | "secondary" | "tertiary";

export type TopicDraftFields = Record<TopicFieldKey, string>;

export type TopicDraft = {
  content: string;
  editingPostId: string | null;
  fields: TopicDraftFields;
  format: TopicFormat;
  guestEmail: string;
  subtopics: string[];
  intent: PostIntent;
  topic: PostTopic | null;
  title: string;
  updatedAt: string | null;
};
