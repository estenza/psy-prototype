import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  isPostgresAuthEnabled,
  queryAuthPostgres,
  type AuthPostgresTransaction,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { enqueueDomainEvent } from "@/lib/domain-events/outbox";
import { sanitizeRichHtml } from "@/lib/safe-html";
import { runStorageUnitOfWork } from "@/lib/unit-of-work";
import { isPostIntent, isPostTopic, normalizePostTopic } from "@/constants/post-taxonomy";
import type { SessionUser } from "@/features/auth/types";
import { formatRelativeDate, formatRelativeDateCompact } from "@/features/comments/lib/comment-format";
import { TOPIC_TITLE_MAX_LENGTH } from "@/features/topic-creation/constants";
import type { Post } from "@/features/feed/types";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

type PostRow = {
  id: string;
  author_user_id: string;
  author_avatar_url: string | null;
  author_role: "user" | "specialist" | null;
  intent: PostIntent;
  topic: PostTopic | null;
  title: string;
  body_html: string;
  excerpt: string;
  media_type: "image" | null;
  media_url: string | null;
  media_alt: string | null;
  comments_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  author_nickname: string | null;
  viewer_liked: boolean | number | null;
  viewer_bookmarked: boolean | number | null;
  viewer_profile_favorite: boolean | number | null;
  feed_priority?: boolean | number | string | null;
};

type PostMutationInput = {
  author: SessionUser;
  content: string;
  intent: PostIntent;
  title: string;
  topic: PostTopic | null;
};

export const FEED_PAGE_SIZE = 20;

type FeedCursor = {
  createdAt: string;
  id: string;
  priority: number;
};

export type ListPostsOptions = {
  cursor?: string | null;
  limit?: number;
  topic?: PostTopic | "all" | null;
};

export type PostsPage = {
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
  posts: Post[];
};

const PG_POST_COLUMNS = `
  posts.id,
  posts.author_user_id,
  posts.intent,
  posts.topic,
  posts.title,
  posts.body_html,
  posts.excerpt,
  posts.media_type,
  posts.media_url,
  posts.media_alt,
  posts.comments_count,
  posts.likes_count,
  posts.created_at::text AS created_at,
  posts.updated_at::text AS updated_at,
  users.display_name AS author_display_name,
  users.nickname AS author_nickname,
  users.avatar_url AS author_avatar_url,
  users.role AS author_role
`;

const POST_EXCERPT_LIMIT = 240;

type PreparedPostRecord = {
  bodyHtml: string;
  excerpt: string;
  intent: PostIntent;
  mediaAlt: string | null;
  mediaType: "image" | null;
  mediaUrl: string | null;
  title: string;
  topic: PostTopic | null;
};

export class PostRepositoryError extends Error {
  readonly fieldErrors?: Partial<Record<"content" | "intent" | "title" | "topic", string>>;
  readonly status: number;

  constructor(
    message: string,
    options?: {
      fieldErrors?: Partial<Record<"content" | "intent" | "title" | "topic", string>>;
      status?: number;
    },
  ) {
    super(message);
    this.name = "PostRepositoryError";
    this.fieldErrors = options?.fieldErrors;
    this.status = options?.status ?? 400;
  }
}

function readPostRow(result: Record<string, unknown> | undefined | null) {
  if (!result) {
    return null;
  }

  return result as unknown as PostRow;
}

async function queryPgRows<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const result = await queryAuthPostgres<T>(query, values);
  return result.rows;
}

async function queryPgOne<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const rows = await queryPgRows<T>(query, values);
  return rows[0] ?? null;
}

function extractFirstImageSource(content: string) {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);

  return match?.[1] ?? null;
}

function normalizeHtmlText(content: string) {
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function trimExcerpt(text: string) {
  if (text.length <= POST_EXCERPT_LIMIT) {
    return text;
  }

  return `${text.slice(0, POST_EXCERPT_LIMIT - 1).trimEnd()}…`;
}

function buildExcerpt(content: string) {
  const imageSource = extractFirstImageSource(content);
  const hasVideo = /data-embedded-media=/i.test(content);
  const normalizedText = normalizeHtmlText(content);

  return trimExcerpt(
    normalizedText ||
      (imageSource && hasVideo
        ? "Добавлены изображение и видео."
        : imageSource
          ? "Добавлено изображение."
          : hasVideo
            ? "Добавлено видео."
            : ""),
  );
}

function formatPublishedAtLabel(createdAtIso: string) {
  return formatRelativeDate(
    Math.floor(new Date(createdAtIso).getTime() / 1000),
  );
}

function formatCompactPublishedAtLabel(createdAtIso: string) {
  return formatRelativeDateCompact(
    Math.floor(new Date(createdAtIso).getTime() / 1000),
  );
}

function readBoolean(value: boolean | number | null | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(value);
}

function readFeedPriority(row: PostRow) {
  const value = row.feed_priority;

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.parseInt(value ?? "0", 10) || 0;
}

function encodeFeedCursor(row: PostRow) {
  const cursor: FeedCursor = {
    createdAt: row.created_at,
    id: row.id,
    priority: readFeedPriority(row),
  };

  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeFeedCursor(cursor: string | null | undefined): FeedCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<FeedCursor>;

    if (
      typeof parsed.createdAt === "string"
      && typeof parsed.id === "string"
      && typeof parsed.priority === "number"
    ) {
      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
        priority: parsed.priority,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeFeedLimit(limit: number | null | undefined) {
  if (!Number.isFinite(limit)) {
    return FEED_PAGE_SIZE;
  }

  return Math.min(50, Math.max(1, Math.floor(limit ?? FEED_PAGE_SIZE)));
}

function normalizeFeedTopic(topic: ListPostsOptions["topic"]) {
  if (!topic || topic === "all") {
    return null;
  }

  return normalizePostTopic(topic);
}

function mapPost(row: PostRow, currentUser: SessionUser | null): Post {
  const author = {
    id: row.author_user_id,
    name: row.author_display_name,
    handle: row.author_nickname ? `@${row.author_nickname}` : `@${row.author_display_name}`,
    avatarUrl: row.author_avatar_url,
    role: row.author_role,
  };
  const isAuthor = Boolean(currentUser && row.author_user_id === currentUser.id);
  const topic = normalizePostTopic(row.topic);

  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    intent: row.intent,
    topic: topic ?? undefined,
    author,
    activity: {
      publishedAtLabel: formatPublishedAtLabel(row.created_at),
      compactPublishedAtLabel: formatCompactPublishedAtLabel(row.created_at),
      lastCommentAtLabel:
        row.comments_count > 0 ? "Есть ответы" : "Без ответов",
      lastCommentAuthor:
        row.comments_count > 0
          ? "Пост обновляется в комментариях"
          : "Станьте первым, кто откликнется",
    },
    content: {
      title: row.title,
      excerpt: row.excerpt,
    },
    stats: {
      comments: row.comments_count,
      likes: row.likes_count,
    },
    viewer: {
      isAuthor,
      liked: readBoolean(row.viewer_liked),
      bookmarked: readBoolean(row.viewer_bookmarked),
      profileFavorite: readBoolean(row.viewer_profile_favorite),
    },
    editorState: {
      content: row.body_html,
      intent: row.intent,
      topic,
      title: row.title,
    },
    media:
      row.media_type === "image" && row.media_url
        ? {
            type: "image",
            src: row.media_url,
            alt: row.media_alt ?? undefined,
          }
        : undefined,
  };
}

function assertValidInput(input: {
  content: string;
  intent: unknown;
  title: string;
  topic: unknown;
}) {
  const fieldErrors: Partial<Record<"content" | "intent" | "title" | "topic", string>> = {};
  const title = input.title.trim();

  if (!title) {
    fieldErrors.title = "Напишите хотя бы немного";
  } else if (title.length > TOPIC_TITLE_MAX_LENGTH) {
    fieldErrors.title = `Заголовок должен быть не длиннее ${TOPIC_TITLE_MAX_LENGTH} символов`;
  }

  if (!isPostIntent(input.intent)) {
    fieldErrors.intent = "Недопустимый формат поста";
  }

  if (input.topic !== null && input.topic !== undefined && !isPostTopic(input.topic)) {
    fieldErrors.topic = "Недопустимая тема поста";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new PostRepositoryError("Не удалось сохранить пост.", {
      fieldErrors,
      status: 400,
    });
  }
}

function preparePostRecord(input: {
  content: string;
  intent: PostIntent;
  title: string;
  topic: PostTopic | null;
}): PreparedPostRecord {
  assertValidInput(input);

  const bodyHtml = sanitizeRichHtml(input.content, {
    allowEmbeddedMedia: true,
  });
  const mediaUrl = extractFirstImageSource(bodyHtml);

  return {
    bodyHtml,
    excerpt: buildExcerpt(bodyHtml),
    intent: input.intent,
    mediaAlt: null,
    mediaType: mediaUrl ? "image" : null,
    mediaUrl,
    title: input.title.trim(),
    topic: normalizePostTopic(input.topic),
  };
}

export async function listPostsPage(
  currentUser: SessionUser | null,
  options: ListPostsOptions = {},
): Promise<PostsPage> {
  const limit = normalizeFeedLimit(options.limit);
  const cursor = decodeFeedCursor(options.cursor);
  const topic = normalizeFeedTopic(options.topic);
  const fetchLimit = limit + 1;

  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<PostRow>(
      `SELECT
        ${PG_POST_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_profile_favorite,
        CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END AS feed_priority
      FROM posts
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = $1
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = $1
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = $1
      LEFT JOIN user_followed_authors AS followed_author
        ON followed_author.follower_user_id = $1
        AND followed_author.followed_user_id = posts.author_user_id
      LEFT JOIN user_ignored_authors AS ignored_author
        ON ignored_author.user_id = $1
        AND ignored_author.ignored_user_id = posts.author_user_id
      WHERE ignored_author.user_id IS NULL
        AND ($2::text IS NULL OR posts.topic = $2)
        AND (
          $3::integer IS NULL
          OR (
            CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END,
            posts.created_at,
            posts.id
          ) < ($3::integer, $4::timestamptz, $5::text)
        )
      ORDER BY
        CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END DESC,
        posts.created_at DESC,
        posts.id DESC
      LIMIT $6`,
      [
        currentUser?.id ?? null,
        topic,
        cursor?.priority ?? null,
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        fetchLimit,
      ],
    );

    const visibleRows = rows.slice(0, limit);

    return {
      pageInfo: {
        endCursor: visibleRows.length > 0
          ? encodeFeedCursor(visibleRows[visibleRows.length - 1])
          : null,
        hasNextPage: rows.length > limit,
      },
      posts: visibleRows.map((row) => mapPost(row, currentUser)),
    };
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        posts.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN 0 ELSE 1 END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN 0 ELSE 1 END AS viewer_profile_favorite,
        CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END AS feed_priority
      FROM posts
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = ?
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = ?
      LEFT JOIN user_followed_authors AS followed_author
        ON followed_author.follower_user_id = ?
        AND followed_author.followed_user_id = posts.author_user_id
      LEFT JOIN user_ignored_authors AS ignored_author
        ON ignored_author.user_id = ?
        AND ignored_author.ignored_user_id = posts.author_user_id
      WHERE ignored_author.user_id IS NULL
        AND (? IS NULL OR posts.topic = ?)
        AND (
          ? IS NULL
          OR CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END < ?
          OR (
            CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END = ?
            AND posts.created_at < ?
          )
          OR (
            CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END = ?
            AND posts.created_at = ?
            AND posts.id < ?
          )
        )
      ORDER BY
        CASE WHEN followed_author.followed_user_id IS NULL THEN 0 ELSE 1 END DESC,
        posts.created_at DESC,
        posts.id DESC
      LIMIT ?`,
    )
    .all(
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      topic,
      topic,
      cursor?.priority ?? null,
      cursor?.priority ?? null,
      cursor?.priority ?? null,
      cursor?.createdAt ?? null,
      cursor?.priority ?? null,
      cursor?.createdAt ?? null,
      cursor?.id ?? null,
      fetchLimit,
    ) as PostRow[];

  const visibleRows = rows.slice(0, limit);

  return {
    pageInfo: {
      endCursor: visibleRows.length > 0
        ? encodeFeedCursor(visibleRows[visibleRows.length - 1])
        : null,
      hasNextPage: rows.length > limit,
    },
    posts: visibleRows.map((row) => mapPost(row, currentUser)),
  };
}

export async function listPosts(currentUser: SessionUser | null) {
  const page = await listPostsPage(currentUser);
  return page.posts;
}

export async function listPostsByAuthorUserId(
  authorUserId: string,
  currentUser: SessionUser | null,
) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<PostRow>(
      `SELECT
        ${PG_POST_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_profile_favorite
      FROM posts
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = $2
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = $2
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = $2
      WHERE posts.author_user_id = $1
      ORDER BY posts.created_at DESC`,
      [authorUserId, currentUser?.id ?? null],
    );

    return rows.map((row) => mapPost(row, currentUser));
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        posts.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN 0 ELSE 1 END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN 0 ELSE 1 END AS viewer_profile_favorite
      FROM posts
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = ?
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = ?
      WHERE posts.author_user_id = ?
      ORDER BY posts.created_at DESC`,
    )
    .all(currentUser?.id ?? null, currentUser?.id ?? null, currentUser?.id ?? null, authorUserId) as PostRow[];

  return rows.map((row) => mapPost(row, currentUser));
}

export async function listProfileFavoritePostsByUserId(
  profileUserId: string,
  currentUser: SessionUser | null,
) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<PostRow>(
      `SELECT
        ${PG_POST_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_profile_favorite
      FROM user_profile_favorite_posts AS profile_favorite
      INNER JOIN posts ON posts.id = profile_favorite.post_id
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = $2
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = $2
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = $2
      LEFT JOIN user_ignored_authors AS ignored_author
        ON ignored_author.user_id = $2
        AND ignored_author.ignored_user_id = posts.author_user_id
      WHERE profile_favorite.user_id = $1
        AND ignored_author.user_id IS NULL
      ORDER BY profile_favorite.created_at DESC`,
      [profileUserId, currentUser?.id ?? null],
    );

    return rows.map((row) => mapPost(row, currentUser));
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        posts.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN 0 ELSE 1 END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN 0 ELSE 1 END AS viewer_profile_favorite
      FROM user_profile_favorite_posts AS profile_favorite
      INNER JOIN posts ON posts.id = profile_favorite.post_id
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = ?
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = ?
      LEFT JOIN user_ignored_authors AS ignored_author
        ON ignored_author.user_id = ?
        AND ignored_author.ignored_user_id = posts.author_user_id
      WHERE profile_favorite.user_id = ?
        AND ignored_author.user_id IS NULL
      ORDER BY profile_favorite.created_at DESC`,
    )
    .all(
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      profileUserId,
    ) as PostRow[];

  return rows.map((row) => mapPost(row, currentUser));
}

export async function listBookmarkedPostsByUserId(
  userId: string,
  currentUser: SessionUser | null,
) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<PostRow>(
      `SELECT
        ${PG_POST_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_profile_favorite
      FROM user_bookmarked_posts AS bookmark
      INNER JOIN posts ON posts.id = bookmark.post_id
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = $2
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = $2
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = $2
      LEFT JOIN user_ignored_authors AS ignored_author
        ON ignored_author.user_id = $2
        AND ignored_author.ignored_user_id = posts.author_user_id
      WHERE bookmark.user_id = $1
        AND ignored_author.user_id IS NULL
      ORDER BY bookmark.created_at DESC`,
      [userId, currentUser?.id ?? null],
    );

    return rows.map((row) => mapPost(row, currentUser));
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        posts.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN 0 ELSE 1 END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN 0 ELSE 1 END AS viewer_profile_favorite
      FROM user_bookmarked_posts AS bookmark
      INNER JOIN posts ON posts.id = bookmark.post_id
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = ?
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = ?
      LEFT JOIN user_ignored_authors AS ignored_author
        ON ignored_author.user_id = ?
        AND ignored_author.ignored_user_id = posts.author_user_id
      WHERE bookmark.user_id = ?
        AND ignored_author.user_id IS NULL
      ORDER BY bookmark.created_at DESC`,
    )
    .all(
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      currentUser?.id ?? null,
      userId,
    ) as PostRow[];

  return rows.map((row) => mapPost(row, currentUser));
}

export async function findPostById(postId: string, currentUser: SessionUser | null) {
  if (isPostgresAuthEnabled()) {
    const row = readPostRow(
      await queryPgOne<PostRow>(
        `SELECT
          ${PG_POST_COLUMNS},
          CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked,
          CASE WHEN viewer_bookmark.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_bookmarked,
          CASE WHEN viewer_profile_favorite.post_id IS NULL THEN FALSE ELSE TRUE END AS viewer_profile_favorite
        FROM posts
        INNER JOIN users ON users.id = posts.author_user_id
        LEFT JOIN post_reactions AS viewer_reaction
          ON viewer_reaction.post_id = posts.id
          AND viewer_reaction.user_id = $2
          AND viewer_reaction.reaction_type = 'like'
        LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
          ON viewer_profile_favorite.post_id = posts.id
          AND viewer_profile_favorite.user_id = $2
        LEFT JOIN user_bookmarked_posts AS viewer_bookmark
          ON viewer_bookmark.post_id = posts.id
          AND viewer_bookmark.user_id = $2
         WHERE posts.id = $1
         LIMIT 1`,
        [postId, currentUser?.id ?? null],
      ),
    );

    return row ? mapPost(row, currentUser) : null;
  }

  const result = getDatabase()
    .prepare(
      `SELECT
        posts.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked,
        CASE WHEN viewer_bookmark.post_id IS NULL THEN 0 ELSE 1 END AS viewer_bookmarked,
        CASE WHEN viewer_profile_favorite.post_id IS NULL THEN 0 ELSE 1 END AS viewer_profile_favorite
      FROM posts
      INNER JOIN users ON users.id = posts.author_user_id
      LEFT JOIN post_reactions AS viewer_reaction
        ON viewer_reaction.post_id = posts.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      LEFT JOIN user_profile_favorite_posts AS viewer_profile_favorite
        ON viewer_profile_favorite.post_id = posts.id
        AND viewer_profile_favorite.user_id = ?
      LEFT JOIN user_bookmarked_posts AS viewer_bookmark
        ON viewer_bookmark.post_id = posts.id
        AND viewer_bookmark.user_id = ?
      WHERE posts.id = ?
      LIMIT 1`,
    )
    .get(currentUser?.id ?? null, currentUser?.id ?? null, currentUser?.id ?? null, postId);

  const row = readPostRow(result);
  return row ? mapPost(row, currentUser) : null;
}

export async function createPost(input: PostMutationInput) {
  const prepared = preparePostRecord(input);
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `INSERT INTO posts (
          id,
          author_user_id,
          intent,
          topic,
          title,
          body_html,
          excerpt,
          media_type,
          media_url,
          media_alt,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          input.author.id,
          prepared.intent,
          prepared.topic,
          prepared.title,
          prepared.bodyHtml,
          prepared.excerpt,
          prepared.mediaType,
          prepared.mediaUrl,
          prepared.mediaAlt,
          timestamp,
          timestamp,
        ],
      );

      await enqueueDomainEvent(unitOfWork, {
        aggregateId: id,
        eventType: "post.published",
        payload: {
          actor: input.author,
          postId: id,
          title: prepared.title,
        },
      });
      return;
    }

    unitOfWork.database
      .prepare(
        `INSERT INTO posts (
          id,
          author_user_id,
          intent,
          topic,
          title,
          body_html,
          excerpt,
          media_type,
          media_url,
          media_alt,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.author.id,
        prepared.intent,
        prepared.topic,
        prepared.title,
        prepared.bodyHtml,
        prepared.excerpt,
        prepared.mediaType,
        prepared.mediaUrl,
        prepared.mediaAlt,
        timestamp,
        timestamp,
      );

    await enqueueDomainEvent(unitOfWork, {
      aggregateId: id,
      eventType: "post.published",
      payload: {
        actor: input.author,
        postId: id,
        title: prepared.title,
      },
    });
  });

  const createdPost = await findPostById(id, input.author);

  if (!createdPost) {
    throw new PostRepositoryError("Не удалось загрузить пост из закладок.", {
      status: 500,
    });
  }

  return createdPost;
}

function assertCanSetPostLike(actor: SessionUser) {
  if (actor.isBanned) {
    throw new PostRepositoryError("Лайки для этого аккаунта недоступны.", {
      status: 403,
    });
  }
}

async function syncPostLikesCountInPostgres(
  transaction: AuthPostgresTransaction,
  postId: string,
) {
  await transaction.query(
    `UPDATE posts
     SET likes_count = (
       SELECT COUNT(*)
       FROM post_reactions
       WHERE post_id = $1
         AND reaction_type = 'like'
     )
     WHERE id = $1`,
    [postId],
  );
}

function syncPostLikesCountInSqlite(database: DatabaseSync, postId: string) {
  database
    .prepare(
      `UPDATE posts
       SET likes_count = (
         SELECT COUNT(*)
         FROM post_reactions
         WHERE post_id = ?
           AND reaction_type = 'like'
       )
       WHERE id = ?`,
    )
    .run(postId, postId);
}

export async function setPostLike(params: {
  actor: SessionUser;
  liked: boolean;
  postId: string;
}) {
  assertCanSetPostLike(params.actor);

  const existingPost = await findPostById(params.postId, params.actor);

  if (!existingPost) {
    throw new PostRepositoryError("Пост не найден.", {
      status: 404,
    });
  }

  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      if (params.liked) {
        await unitOfWork.transaction.query(
          `INSERT INTO post_reactions (
            id,
            post_id,
            user_id,
            reaction_type,
            created_at
          )
          VALUES ($1, $2, $3, 'like', $4)
          ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING`,
          [randomUUID(), params.postId, params.actor.id, timestamp],
        );
      } else {
        await unitOfWork.transaction.query(
          `DELETE FROM post_reactions
           WHERE post_id = $1
             AND user_id = $2
             AND reaction_type = 'like'`,
          [params.postId, params.actor.id],
        );
      }

      await syncPostLikesCountInPostgres(unitOfWork.transaction, params.postId);
      return;
    }

    if (params.liked) {
      unitOfWork.database
        .prepare(
          `INSERT OR IGNORE INTO post_reactions (
              id,
              post_id,
              user_id,
              reaction_type,
              created_at
            )
            VALUES (?, ?, ?, 'like', ?)`,
        )
        .run(randomUUID(), params.postId, params.actor.id, timestamp);
    } else {
      unitOfWork.database
        .prepare(
          `DELETE FROM post_reactions
             WHERE post_id = ?
               AND user_id = ?
               AND reaction_type = 'like'`,
        )
        .run(params.postId, params.actor.id);
    }

    syncPostLikesCountInSqlite(unitOfWork.database, params.postId);
  });

  const updatedPost = await findPostById(params.postId, params.actor);

  if (!updatedPost) {
    throw new PostRepositoryError("Не удалось загрузить пост после обновления лайка.", {
      status: 500,
    });
  }

  return updatedPost;
}

export async function setPostProfileFavorite(params: {
  actor: SessionUser;
  favorited: boolean;
  postId: string;
}) {
  if (params.actor.isBanned) {
    throw new PostRepositoryError("Добавление в профиль для этого аккаунта недоступно.", {
      status: 403,
    });
  }

  const existingPost = await findPostById(params.postId, params.actor);

  if (!existingPost) {
    throw new PostRepositoryError("Пост не найден.", {
      status: 404,
    });
  }

  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      if (params.favorited) {
        await unitOfWork.transaction.query(
          `INSERT INTO user_profile_favorite_posts (
            user_id,
            post_id,
            created_at
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, post_id) DO NOTHING`,
          [params.actor.id, params.postId, timestamp],
        );
        return;
      }

      await unitOfWork.transaction.query(
        `DELETE FROM user_profile_favorite_posts
         WHERE user_id = $1
           AND post_id = $2`,
        [params.actor.id, params.postId],
      );
      return;
    }

    if (params.favorited) {
      unitOfWork.database
        .prepare(
          `INSERT OR IGNORE INTO user_profile_favorite_posts (
            user_id,
            post_id,
            created_at
          )
          VALUES (?, ?, ?)`,
        )
        .run(params.actor.id, params.postId, timestamp);
      return;
    }

    unitOfWork.database
      .prepare(
        `DELETE FROM user_profile_favorite_posts
           WHERE user_id = ?
             AND post_id = ?`,
      )
      .run(params.actor.id, params.postId);
  });

  const updatedPost = await findPostById(params.postId, params.actor);

  if (!updatedPost) {
    throw new PostRepositoryError("Не удалось загрузить пост после обновления избранного.", {
      status: 500,
    });
  }

  return updatedPost;
}

export async function setPostBookmark(params: {
  actor: SessionUser;
  bookmarked: boolean;
  postId: string;
}) {
  if (params.actor.isBanned) {
    throw new PostRepositoryError("Закладки для этого аккаунта недоступны.", {
      status: 403,
    });
  }

  const existingPost = await findPostById(params.postId, params.actor);

  if (!existingPost) {
    throw new PostRepositoryError("Пост не найден.", {
      status: 404,
    });
  }

  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      if (params.bookmarked) {
        await unitOfWork.transaction.query(
          `INSERT INTO user_bookmarked_posts (
            user_id,
            post_id,
            created_at
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, post_id) DO NOTHING`,
          [params.actor.id, params.postId, timestamp],
        );
        return;
      }

      await unitOfWork.transaction.query(
        `DELETE FROM user_bookmarked_posts
         WHERE user_id = $1
           AND post_id = $2`,
        [params.actor.id, params.postId],
      );
      return;
    }

    if (params.bookmarked) {
      unitOfWork.database
        .prepare(
          `INSERT OR IGNORE INTO user_bookmarked_posts (
            user_id,
            post_id,
            created_at
          )
          VALUES (?, ?, ?)`,
        )
        .run(params.actor.id, params.postId, timestamp);
      return;
    }

    unitOfWork.database
      .prepare(
        `DELETE FROM user_bookmarked_posts
           WHERE user_id = ?
             AND post_id = ?`,
      )
      .run(params.actor.id, params.postId);
  });

  const updatedPost = await findPostById(params.postId, params.actor);

  if (!updatedPost) {
    throw new PostRepositoryError("Не удалось загрузить пост после обновления закладок.", {
      status: 500,
    });
  }

  return updatedPost;
}

export async function updatePost(postId: string, input: PostMutationInput) {
  const existingPost = await findPostById(postId, input.author);

  if (!existingPost) {
    throw new PostRepositoryError("Пост не найден.", {
      status: 404,
    });
  }

  if (existingPost.author.id !== input.author.id) {
    throw new PostRepositoryError("Редактировать можно только свои посты.", {
      status: 403,
    });
  }

  const prepared = preparePostRecord(input);
  const updatedAt = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `UPDATE posts
        SET
          intent = $1,
          topic = $2,
          title = $3,
          body_html = $4,
          excerpt = $5,
          media_type = $6,
          media_url = $7,
          media_alt = $8,
          updated_at = $9
        WHERE id = $10`,
        [
          prepared.intent,
          prepared.topic,
          prepared.title,
          prepared.bodyHtml,
          prepared.excerpt,
          prepared.mediaType,
          prepared.mediaUrl,
          prepared.mediaAlt,
          updatedAt,
          postId,
        ],
      );
      return;
    }

    unitOfWork.database
      .prepare(
        `UPDATE posts
          SET
            intent = ?,
            topic = ?,
            title = ?,
            body_html = ?,
            excerpt = ?,
            media_type = ?,
            media_url = ?,
            media_alt = ?,
            updated_at = ?
          WHERE id = ?`,
      )
      .run(
        prepared.intent,
        prepared.topic,
        prepared.title,
        prepared.bodyHtml,
        prepared.excerpt,
        prepared.mediaType,
        prepared.mediaUrl,
        prepared.mediaAlt,
        updatedAt,
        postId,
      );
  });

  const updatedPost = await findPostById(postId, input.author);

  if (!updatedPost) {
    throw new PostRepositoryError("Не удалось загрузить обновлённый пост.", {
      status: 500,
    });
  }

  return updatedPost;
}

export async function deletePost(postId: string, actor: SessionUser) {
  const existingPost = await findPostById(postId, actor);

  if (!existingPost) {
    throw new PostRepositoryError("Пост не найден.", {
      status: 404,
    });
  }

  if (existingPost.author.id !== actor.id) {
    throw new PostRepositoryError("Удалять можно только свои посты.", {
      status: 403,
    });
  }

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `DELETE FROM posts
         WHERE id = $1`,
        [postId],
      );
      return;
    }

    unitOfWork.database
      .prepare(
        `DELETE FROM posts
         WHERE id = ?`,
      )
      .run(postId);
  });
}
