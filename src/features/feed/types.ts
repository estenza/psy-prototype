import type { PostIntent, PostTopic } from "@/types/post-taxonomy";
import type { UserSummary } from "@/types/user";

export type Post = {
  id: string;
  createdAt: Date;
  intent: PostIntent;
  topic?: PostTopic;
  subtopic?: string | null;
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
    views: number;
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
    subtopic: string | null;
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

export type FeedSortMode = "Новые" | "Обсуждают";

export type FeedTopicFilter = PostTopic | "all";

export type FeedPageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};

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
    specialist_status?: "none" | "pending" | "verified" | "rejected" | "suspended" | null;
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
    views?: number;
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
  subtopic?: string | null;
  title: string;
  topic: PostTopic | null;
};

export type PostMutationResponse = {
  ok: true;
  post: Post;
};

export type PostRouteErrorResponse = {
  error: string;
  fieldErrors?: Partial<Record<"content" | "intent" | "subtopic" | "title" | "topic", string>>;
};

export type PostsResponsePayload = {
  pageInfo?: FeedPageInfo;
  posts: Post[];
};

export type AdminPostStatus = "deleted" | "hidden" | "published";

export type AdminPostsFilters = {
  search: string;
  status: AdminPostStatus | "all";
};

export type AdminPostTimelineItem = {
  id: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  excerpt: string;
  intent: PostIntent;
  topic: PostTopic | null;
  subtopic: string | null;
  status: AdminPostStatus;
  hiddenReason: string | null;
  commentsCount: number;
  likesCount: number;
  viewsCount: number;
  uncheckedReportsCount: number;
  createdAt: string;
  updatedAt: string;
  hiddenAt: string | null;
  deletedAt: string | null;
  author: {
    id: string;
    name: string;
    handle: string;
  };
};
