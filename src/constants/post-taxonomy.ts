import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

export const DEFAULT_POST_INTENT: PostIntent = "support";
export const DEFAULT_POST_SUBTOPIC = "Свободная тема";

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
  { value: "emotions", label: "Моё состояние" },
  { value: "relationships", label: "Отношения" },
  { value: "work-money", label: "Работа и учёба" },
  { value: "crisis-loss", label: "События в жизни" },
] as const satisfies ReadonlyArray<{ label: string; value: PostTopic }>;

export const POST_TOPIC_META: Record<
  PostTopic,
  {
    label: string;
  }
> = {
  "free-topic": { label: "Моё состояние" },
  relationships: { label: "Отношения" },
  emotions: { label: "Моё состояние" },
  "self-esteem": { label: "Моё состояние" },
  family: { label: "Отношения" },
  "work-money": { label: "Работа и учёба" },
  "habits-addictions": { label: "Моё состояние" },
  "crisis-loss": { label: "События в жизни" },
  "self-development": { label: "Моё состояние" },
  "social-situations": { label: "Отношения" },
  "hard-states": { label: "Моё состояние" },
};

export const POST_TOPIC_SUBTOPICS: Partial<Record<PostTopic, readonly string[]>> = {
  emotions: [
    DEFAULT_POST_SUBTOPIC,
    "Стресс",
    "Упадок сил",
    "Нестабильная самооценка",
    "Приступы страха и тревоги",
    "Перепады настроения",
    "Раздражительность",
    "Ощущение одиночества",
    "Проблемы с концентрацией",
    "Эмоциональная зависимость",
    "Проблемы со сном",
    "Расстройство пищевого поведения",
    "Панические атаки",
    "Навязчивые мысли о здоровье",
    "Сложности с алкоголем / наркотиками",
  ],
  relationships: [
    DEFAULT_POST_SUBTOPIC,
    "С партнёром",
    "В целом, с окружающими",
    "С родителями",
    "С детьми",
    "Сексуальные",
    "Сложности с ориентацией, её поиск",
  ],
  "work-money": [
    DEFAULT_POST_SUBTOPIC,
    "Недостаток мотивации",
    "Выгорание",
    "«Не знаю, чем хочу заниматься»",
    "Прокрастинация",
    "Отсутствие цели",
    "Смена, потеря работы",
  ],
  "crisis-loss": [
    DEFAULT_POST_SUBTOPIC,
    "Переезд, эмиграция",
    "Беременность, рождение ребёнка",
    "Разрыв отношений, развод",
    "Финансовые изменения",
    "Утрата близкого человека",
    "Болезнь, своя или близких",
    "Насилие",
  ],
} as const;

export const POST_TOPIC_FILTER_OPTIONS = [
  { value: "all", label: "Все темы" },
  ...POST_TOPIC_OPTIONS,
] as const;

export function isPostIntent(value: unknown): value is PostIntent {
  return value === "support" || value === "discussion";
}

export function isPostTopic(value: unknown): value is PostTopic {
  return typeof value === "string" && value !== "free-topic" && value in POST_TOPIC_META;
}

export function normalizePostTopic(value: unknown): PostTopic | null {
  if (value === "relationships" || value === "family" || value === "social-situations") {
    return "relationships";
  }

  if (value === "work-money") {
    return "work-money";
  }

  if (value === "crisis-loss") {
    return "crisis-loss";
  }

  if (
    value === "emotions"
    || value === "self-esteem"
    || value === "habits-addictions"
    || value === "self-development"
    || value === "hard-states"
  ) {
    return "emotions";
  }

  return null;
}
