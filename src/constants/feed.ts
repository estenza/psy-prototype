import type { FeedSortMode, ViewMode } from "@/types/feed";

export const DEFAULT_VIEW_MODE: ViewMode = "card";
export const DEFAULT_FEED_SORT_MODE: FeedSortMode = "Новые";

export const FEED_SORT_OPTIONS: readonly FeedSortMode[] = [
  "Новые",
  "Горячее",
  "Без ответа",
];

export const FEED_VIEW_OPTIONS = [
  { label: "Карточный", value: "card" as const },
  { label: "Компактный", value: "compact" as const },
  { label: "Форумный", value: "forum" as const },
] satisfies ReadonlyArray<{ label: string; value: ViewMode }>;
