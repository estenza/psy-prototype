import type { Post } from "@/features/feed/types";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

const PUBLISHED_POSTS_STORAGE_KEY = "psy-prototype:feed:published-posts";
const HIGHLIGHT_POST_ID_STORAGE_KEY = "psy-prototype:feed:highlight-post-id";
const MAX_PUBLISHED_POSTS = 20;
const PUBLISHED_POST_EXCERPT_LIMIT = 240;

const CURRENT_AUTHOR = {
  handle: "@vz",
  name: "VZ",
} as const;

type CreatePublishedPostInput = {
  content: string;
  existingPost?: Post | null;
  intent: PostIntent;
  title: string;
  topic: PostTopic | null;
};

type StoredPublishedPost = Omit<Post, "createdAt"> & {
  createdAtIso: string;
};

function buildLegacyEditorContent(post: StoredPublishedPost) {
  const excerptParagraph = post.content.excerpt
    ? `<p>${post.content.excerpt
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</p>`
    : "";
  const imageBlock =
    post.media?.type === "image"
      ? `<img src="${post.media.src.replace(/"/g, "&quot;")}" alt="${(post.media.alt ?? "").replace(/"/g, "&quot;")}" />`
      : "";

  return `${excerptParagraph}${imageBlock}`.trim();
}

function deserializePublishedPost(record: StoredPublishedPost): Post {
  const isAuthor =
    record.viewer?.isAuthor ?? record.author.handle === CURRENT_AUTHOR.handle;

  return {
    ...record,
    createdAt: new Date(record.createdAtIso),
    viewer: {
      isAuthor,
      liked: record.viewer?.liked ?? false,
      bookmarked: record.viewer?.bookmarked ?? false,
    },
    editorState: isAuthor
      ? {
          content:
            record.editorState?.content ?? buildLegacyEditorContent(record),
          intent: record.editorState?.intent ?? record.intent,
          topic: record.editorState?.topic ?? (record.topic ?? null),
          title: record.editorState?.title ?? record.content.title,
        }
      : undefined,
  };
}

function extractFirstImageSource(content: string) {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);

  return match?.[1];
}

function hasEmbeddedVideo(content: string) {
  return /data-embedded-media=/i.test(content);
}

function normalizeContentText(content: string) {
  if (typeof window !== "undefined") {
    const parsedContent = new window.DOMParser().parseFromString(
      content,
      "text/html",
    );

    return parsedContent.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function serializePublishedPost(post: Post): StoredPublishedPost {
  return {
    ...post,
    createdAtIso: post.createdAt.toISOString(),
  };
}

function trimExcerpt(text: string) {
  if (text.length <= PUBLISHED_POST_EXCERPT_LIMIT) {
    return text;
  }

  return `${text.slice(0, PUBLISHED_POST_EXCERPT_LIMIT - 1).trimEnd()}…`;
}

export function createPublishedPost({
  content,
  existingPost = null,
  intent,
  title,
  topic,
}: CreatePublishedPostInput): Post {
  const createdAt = existingPost?.createdAt ?? new Date();
  const imageSource = extractFirstImageSource(content);
  const hasVideo = hasEmbeddedVideo(content);
  const normalizedText = normalizeContentText(content);
  const excerpt = trimExcerpt(
    normalizedText ||
      (imageSource && hasVideo
        ? "Добавлены изображение и видео."
        : imageSource
          ? "Добавлено изображение."
          : hasVideo
            ? "Добавлено видео."
            : ""),
  );
  const postId =
    existingPost?.id ??
    `local-post-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: postId,
    createdAt,
    intent,
    topic: topic ?? undefined,
    author: CURRENT_AUTHOR,
    activity:
      existingPost?.activity ?? {
        publishedAtLabel: "только что",
        lastCommentAtLabel: "Без ответов",
        lastCommentAuthor: "Станьте первым, кто откликнется",
      },
    content: {
      title: title.trim(),
      excerpt,
    },
    stats: existingPost?.stats ?? {
      comments: 0,
      likes: 0,
    },
    viewer: {
      isAuthor: true,
      liked: existingPost?.viewer.liked ?? false,
      bookmarked: existingPost?.viewer.bookmarked ?? false,
    },
    editorState: {
      content,
      intent,
      topic,
      title: title.trim(),
    },
    media: imageSource
      ? {
          type: "image",
          src: imageSource,
        }
      : undefined,
  };
}

export function mergePublishedPosts(basePosts: Post[], publishedPosts: Post[]) {
  const mergedPosts = [...publishedPosts, ...basePosts];
  const uniquePosts = new Map<string, Post>();

  mergedPosts.forEach((post) => {
    if (!uniquePosts.has(post.id)) {
      uniquePosts.set(post.id, post);
    }
  });

  return Array.from(uniquePosts.values());
}

export function readPublishedPosts() {
  if (typeof window === "undefined") {
    return [] as Post[];
  }

  try {
    const rawPosts = window.localStorage.getItem(PUBLISHED_POSTS_STORAGE_KEY);

    if (!rawPosts) {
      return [] as Post[];
    }

    const parsedPosts: unknown = JSON.parse(rawPosts);

    if (!Array.isArray(parsedPosts)) {
      return [] as Post[];
    }

    return parsedPosts
      .filter((record): record is StoredPublishedPost => {
        return (
          !!record &&
          typeof record === "object" &&
          "id" in record &&
          "createdAtIso" in record &&
          "content" in record &&
          "author" in record
        );
      })
      .map(deserializePublishedPost)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  } catch {
    return [] as Post[];
  }
}

export function savePublishedPost(post: Post) {
  if (typeof window === "undefined") {
    return;
  }

  const storedPosts = readPublishedPosts();
  const nextPosts = [
    post,
    ...storedPosts.filter((storedPost) => storedPost.id !== post.id),
  ].slice(0, MAX_PUBLISHED_POSTS);

  window.localStorage.setItem(
    PUBLISHED_POSTS_STORAGE_KEY,
    JSON.stringify(nextPosts.map(serializePublishedPost)),
  );
}

export function findPublishedPostById(postId: string) {
  return readPublishedPosts().find((post) => post.id === postId) ?? null;
}

export function consumeHighlightedPublishedPostId() {
  if (typeof window === "undefined") {
    return null;
  }

  const highlightedPostId = window.sessionStorage.getItem(
    HIGHLIGHT_POST_ID_STORAGE_KEY,
  );

  if (!highlightedPostId) {
    return null;
  }

  window.sessionStorage.removeItem(HIGHLIGHT_POST_ID_STORAGE_KEY);

  return highlightedPostId;
}

export function readHighlightedPublishedPostId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(HIGHLIGHT_POST_ID_STORAGE_KEY);
}

export function clearHighlightedPublishedPostId() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(HIGHLIGHT_POST_ID_STORAGE_KEY);
}

export function markPublishedPostForHighlight(postId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(HIGHLIGHT_POST_ID_STORAGE_KEY, postId);
}
