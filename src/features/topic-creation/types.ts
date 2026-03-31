import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

export type TopicDraft = {
  content: string;
  editingPostId: string | null;
  intent: PostIntent;
  topic: PostTopic | null;
  title: string;
  updatedAt: string | null;
};
