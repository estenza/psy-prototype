import { POST_INTENT_META } from "@/constants/post-taxonomy";
import type { TopicDraft } from "@/features/topic-creation/types";
import type { PostIntent } from "@/types/post-taxonomy";

export const TOPIC_TITLE_MAX_LENGTH = 100;
export const TOPIC_TITLE_WARNING_THRESHOLD = 20;

export const DEFAULT_TOPIC_INTENT: PostIntent = "discussion";

export const EMPTY_TOPIC_DRAFT: TopicDraft = {
  content: "",
  editingPostId: null,
  intent: DEFAULT_TOPIC_INTENT,
  topic: null,
  title: "",
  updatedAt: null,
};

export const topicIntentMeta: Record<
  PostIntent,
  {
    description: string;
    editorHint: string;
    editorPlaceholder: string;
    label: string;
  }
> = {
  support: {
    description: POST_INTENT_META.support.description,
    editorHint:
      "Можно писать неровно и неидеально. Начните с того, что сейчас особенно тяжело или важно проговорить.",
    editorPlaceholder:
      "Если вам нужна поддержка, попробуйте спокойно описать, что с вами происходит и что сейчас особенно непросто.",
    label: POST_INTENT_META.support.label,
  },
  discussion: {
    description: POST_INTENT_META.discussion.description,
    editorHint:
      "Опишите контекст, что вы уже пробовали и какой взгляд со стороны или опыт вам сейчас нужен.",
    editorPlaceholder:
      "Опишите ситуацию, добавьте детали и сформулируйте, какой опыт или мнения вам хотелось бы услышать.",
    label: POST_INTENT_META.discussion.label,
  },
};
