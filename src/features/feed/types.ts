import type { PostIntent, PostTopic } from "@/types/post-taxonomy";
import type { UserSummary } from "@/types/user";

export type Post = {
  id: string;
  createdAt: Date;
  intent: PostIntent;
  topic?: PostTopic;
  author: UserSummary;
  activity: {
    publishedAtLabel: string;
    compactPublishedAtLabel: string;
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
    isAuthor: boolean;
    liked: boolean;
    bookmarked: boolean;
    profileFavorite: boolean;
  };
  editorState?: {
    content: string;
    intent: PostIntent;
    topic: PostTopic | null;
    title: string;
  };
  media?: {
    type: "image";
    src: string;
    alt?: string;
  };
};

export type ViewMode = "card" | "compact";

export type FeedSortMode = "Новые" | "Горячее" | "Без ответа";

export type FeedTopicFilter = PostTopic | "all";

export type ApiPostRecord = {
  id: string;
  created_at_iso: string;
  intent: PostIntent;
  topic?: PostTopic;
  author: {
    id?: string;
    avatar_url?: string | null;
    display_name: string;
    role?: "user" | "specialist" | null;
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
    detail?: string;
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
    is_author?: boolean;
    liked: boolean;
    bookmarked: boolean;
    profile_favorite?: boolean;
  };
};

export type PostMutationPayload = {
  content: string;
  intent: PostIntent;
  title: string;
  topic: PostTopic | null;
};

export type PostMutationResponse = {
  ok: true;
  post: Post;
};

export type PostRouteErrorResponse = {
  error: string;
  fieldErrors?: Partial<Record<"content" | "intent" | "title" | "topic", string>>;
};

export type PostsResponsePayload = {
  posts: Post[];
};
