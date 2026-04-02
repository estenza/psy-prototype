import type { CommentsSortValue, CommentsViewer } from "@/features/comments/types";

export const HYVOR_TALK_FALLBACK_WEBSITE_ID = "15244";
export const HYVOR_DATA_API_BASE_URL = "https://talk.hyvor.com/api/data/v1";
export const HYVOR_CONSOLE_API_BASE_URL = "https://talk.hyvor.com/api/console/v1";

export const COMMENTS_PAGE_SIZE = 50;
export const COMMENTS_MAX_FETCH_COUNT = 200;
export const COMMENT_PREVIEW_CHARACTER_LIMIT = 220;

export const COMMENTS_SORT_OPTIONS: Array<{
  value: CommentsSortValue;
  label: string;
}> = [
  {
    value: "top",
    label: "Популярные",
  },
  {
    value: "newest",
    label: "Сначала новые",
  },
];

export const PROTOTYPE_COMMENTS_VIEWER: CommentsViewer = {
  displayName: "VZ",
  handle: "@vz",
  initials: "VZ",
  avatarUrl: null,
  hyvorUserHtid: null,
  kind: "guest-prototype",
  isAuthenticated: false,
};
