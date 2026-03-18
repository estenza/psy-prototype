import type { UserSummary } from "@/types/user";

export type Post = {
  id: string;
  author: UserSummary;
  activity: {
    publishedAtLabel: string;
    lastCommentAtLabel: string;
    lastCommentAuthor: string;
  };
  content: {
    title: string;
    excerpt: string;
  };
  stats: {
    comments: number;
    likes: number;
  };
  viewer: {
    liked: boolean;
    bookmarked: boolean;
  };
  media?: {
    type: "image";
    src: string;
    alt?: string;
  };
};

export type ViewMode = "card" | "compact" | "forum";

export type FeedSortMode = "Новые" | "Горячее" | "Без ответа";

export type ApiPostRecord = {
  id: string;
  author: {
    display_name: string;
    username: string;
  };
  timeline: {
    published_at_label: string;
    last_comment_at_label: string;
    last_comment_author: string;
  };
  body: {
    title: string;
    excerpt: string;
    media?: {
      kind: "image";
      url: string;
      alt_text?: string;
    };
  };
  counters: {
    comments: number;
    likes: number;
  };
  viewer_state: {
    liked: boolean;
    bookmarked: boolean;
  };
};
