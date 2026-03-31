import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

export const DEFAULT_POST_INTENT: PostIntent = "support";

export const POST_INTENT_META: Record<
  PostIntent,
  {
    badgeLabel: string;
    description: string;
    label: string;
  }
> = {
  support: {
    badgeLabel: "Демо-консультация",
    description:
      "Люди будут отвечать бережно и с эмпатией, без непрошенных советов.",
    label: "Демо-консультация",
  },
  discussion: {
    badgeLabel: "Узнать мнения",
    description:
      "Пользователи смогут делиться опытом, мнениями и обсуждать вашу ситуацию.",
    label: "Узнать мнения",
  },
};

export const POST_TOPIC_OPTIONS = [
  { value: "relationships", label: "Отношения" },
  { value: "emotions", label: "Эмоции и состояния" },
  { value: "self-esteem", label: "Самооценка и личность" },
  { value: "family", label: "Семья и близкие" },
  { value: "work-money", label: "Работа и деньги" },
  { value: "habits-addictions", label: "Привычки и зависимости" },
  { value: "crisis-loss", label: "Кризисы и утраты" },
  { value: "self-development", label: "Саморазвитие" },
  { value: "social-situations", label: "Социальные ситуации" },
  { value: "hard-states", label: "Тяжёлые состояния" },
] as const satisfies ReadonlyArray<{ label: string; value: PostTopic }>;

export const POST_TOPIC_META: Record<
  PostTopic,
  {
    label: string;
  }
> = Object.fromEntries(
  POST_TOPIC_OPTIONS.map((option) => [option.value, { label: option.label }]),
) as Record<PostTopic, { label: string }>;

export const POST_TOPIC_FILTER_OPTIONS = [
  { value: "all", label: "Все темы" },
  ...POST_TOPIC_OPTIONS,
] as const;

export function isPostIntent(value: unknown): value is PostIntent {
  return value === "support" || value === "discussion";
}

export function isPostTopic(value: unknown): value is PostTopic {
  return POST_TOPIC_OPTIONS.some((option) => option.value === value);
}
