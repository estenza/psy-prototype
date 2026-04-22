import "server-only";

import { randomUUID } from "node:crypto";
import { execAuthPostgres, isPostgresAuthEnabled, queryAuthPostgres } from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { isPostIntent, isPostTopic } from "@/constants/post-taxonomy";
import type { SessionUser } from "@/features/auth/types";
import { formatRelativeDate, formatRelativeDateCompact } from "@/features/comments/lib/comment-format";
import { TOPIC_TITLE_MAX_LENGTH } from "@/features/topic-creation/constants";
import { hasTopicBodyContent } from "@/features/topic-creation/lib/draft-storage";
import type { Post } from "@/features/feed/types";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

type DiscussionRow = {
  id: string;
  author_user_id: string;
  author_avatar_url: string | null;
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
};

type DiscussionMutationInput = {
  author: SessionUser;
  content: string;
  intent: PostIntent;
  title: string;
  topic: PostTopic | null;
};

const PG_DISCUSSION_COLUMNS = `
  discussions.id,
  discussions.author_user_id,
  discussions.intent,
  discussions.topic,
  discussions.title,
  discussions.body_html,
  discussions.excerpt,
  discussions.media_type,
  discussions.media_url,
  discussions.media_alt,
  discussions.comments_count,
  discussions.likes_count,
  discussions.created_at::text AS created_at,
  discussions.updated_at::text AS updated_at,
  users.display_name AS author_display_name,
  users.nickname AS author_nickname,
  users.avatar_url AS author_avatar_url
`;

const DISCUSSION_SELECT_BASE = `
  SELECT ${PG_DISCUSSION_COLUMNS}
  FROM discussions
  INNER JOIN users ON users.id = discussions.author_user_id
`;

const DISCUSSION_EXCERPT_LIMIT = 240;

type PreparedDiscussionRecord = {
  bodyHtml: string;
  excerpt: string;
  intent: PostIntent;
  mediaAlt: string | null;
  mediaType: "image" | null;
  mediaUrl: string | null;
  title: string;
  topic: PostTopic | null;
};

export class DiscussionRepositoryError extends Error {
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
    this.name = "DiscussionRepositoryError";
    this.fieldErrors = options?.fieldErrors;
    this.status = options?.status ?? 400;
  }
}

function readDiscussionRow(result: Record<string, unknown> | undefined | null) {
  if (!result) {
    return null;
  }

  return result as unknown as DiscussionRow;
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
  if (text.length <= DISCUSSION_EXCERPT_LIMIT) {
    return text;
  }

  return `${text.slice(0, DISCUSSION_EXCERPT_LIMIT - 1).trimEnd()}…`;
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

function mapDiscussion(row: DiscussionRow, currentUser: SessionUser | null): Post {
  const author = {
    id: row.author_user_id,
    name: row.author_display_name,
    handle: row.author_nickname ? `@${row.author_nickname}` : row.author_display_name,
    avatarUrl: row.author_avatar_url,
  };
  const isAuthor = Boolean(currentUser && row.author_user_id === currentUser.id);

  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    intent: row.intent,
    topic: row.topic ?? undefined,
    author,
    activity: {
      publishedAtLabel: formatPublishedAtLabel(row.created_at),
      compactPublishedAtLabel: formatCompactPublishedAtLabel(row.created_at),
      lastCommentAtLabel:
        row.comments_count > 0 ? "Есть ответы" : "Без ответов",
      lastCommentAuthor:
        row.comments_count > 0
          ? "Обсуждение обновляется в комментариях"
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
      bookmarked: false,
    },
    editorState: {
      content: row.body_html,
      intent: row.intent,
      topic: row.topic,
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
    fieldErrors.title = "Введите заголовок обсуждения.";
  } else if (title.length > TOPIC_TITLE_MAX_LENGTH) {
    fieldErrors.title = `Заголовок должен быть не длиннее ${TOPIC_TITLE_MAX_LENGTH} символов.`;
  }

  if (!hasTopicBodyContent(input.content)) {
    fieldErrors.content = "Добавьте текст обсуждения.";
  }

  if (!isPostIntent(input.intent)) {
    fieldErrors.intent = "Недопустимый формат обсуждения.";
  }

  if (input.topic !== null && input.topic !== undefined && !isPostTopic(input.topic)) {
    fieldErrors.topic = "Недопустимая тема обсуждения.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new DiscussionRepositoryError("Не удалось сохранить обсуждение.", {
      fieldErrors,
      status: 400,
    });
  }
}

function prepareDiscussionRecord(input: {
  content: string;
  intent: PostIntent;
  title: string;
  topic: PostTopic | null;
}): PreparedDiscussionRecord {
  assertValidInput(input);

  const mediaUrl = extractFirstImageSource(input.content);

  return {
    bodyHtml: input.content,
    excerpt: buildExcerpt(input.content),
    intent: input.intent,
    mediaAlt: null,
    mediaType: mediaUrl ? "image" : null,
    mediaUrl,
    title: input.title.trim(),
    topic: input.topic,
  };
}

export async function listDiscussions(currentUser: SessionUser | null) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<DiscussionRow>(
      `SELECT
        ${PG_DISCUSSION_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked
      FROM discussions
      INNER JOIN users ON users.id = discussions.author_user_id
      LEFT JOIN discussion_reactions AS viewer_reaction
        ON viewer_reaction.discussion_id = discussions.id
        AND viewer_reaction.user_id = $1
        AND viewer_reaction.reaction_type = 'like'
      ORDER BY discussions.created_at DESC`,
      [currentUser?.id ?? null],
    );

    return rows.map((row) => mapDiscussion(row, currentUser));
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        discussions.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked
      FROM discussions
      INNER JOIN users ON users.id = discussions.author_user_id
      LEFT JOIN discussion_reactions AS viewer_reaction
        ON viewer_reaction.discussion_id = discussions.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      ORDER BY discussions.created_at DESC`,
    )
    .all(currentUser?.id ?? null) as DiscussionRow[];

  return rows.map((row) => mapDiscussion(row, currentUser));
}

export async function findDiscussionById(postId: string, currentUser: SessionUser | null) {
  if (isPostgresAuthEnabled()) {
    const row = readDiscussionRow(
      await queryPgOne<DiscussionRow>(
        `SELECT
          ${PG_DISCUSSION_COLUMNS},
          CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked
        FROM discussions
        INNER JOIN users ON users.id = discussions.author_user_id
        LEFT JOIN discussion_reactions AS viewer_reaction
          ON viewer_reaction.discussion_id = discussions.id
          AND viewer_reaction.user_id = $2
          AND viewer_reaction.reaction_type = 'like'
         WHERE discussions.id = $1
         LIMIT 1`,
        [postId, currentUser?.id ?? null],
      ),
    );

    return row ? mapDiscussion(row, currentUser) : null;
  }

  const result = getDatabase()
    .prepare(
      `SELECT
        discussions.*,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked
      FROM discussions
      INNER JOIN users ON users.id = discussions.author_user_id
      LEFT JOIN discussion_reactions AS viewer_reaction
        ON viewer_reaction.discussion_id = discussions.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      WHERE discussions.id = ?
      LIMIT 1`,
    )
    .get(currentUser?.id ?? null, postId);

  const row = readDiscussionRow(result);
  return row ? mapDiscussion(row, currentUser) : null;
}

export async function createDiscussion(input: DiscussionMutationInput) {
  const prepared = prepareDiscussionRecord(input);
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `INSERT INTO discussions (
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

    const createdDiscussion = await findDiscussionById(id, input.author);

    if (!createdDiscussion) {
      throw new DiscussionRepositoryError("Не удалось загрузить сохранённое обсуждение.", {
        status: 500,
      });
    }

    return createdDiscussion;
  }

  getDatabase()
    .prepare(
      `INSERT INTO discussions (
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

  const createdDiscussion = await findDiscussionById(id, input.author);

  if (!createdDiscussion) {
    throw new DiscussionRepositoryError("Не удалось загрузить сохранённое обсуждение.", {
      status: 500,
    });
  }

  return createdDiscussion;
}

function assertCanSetDiscussionLike(actor: SessionUser) {
  if (actor.isBanned) {
    throw new DiscussionRepositoryError("Лайки для этого аккаунта недоступны.", {
      status: 403,
    });
  }
}

async function syncDiscussionLikesCount(postId: string) {
  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussions
       SET likes_count = (
         SELECT COUNT(*)
         FROM discussion_reactions
         WHERE discussion_id = $1
           AND reaction_type = 'like'
       )
       WHERE id = $1`,
      [postId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE discussions
       SET likes_count = (
         SELECT COUNT(*)
         FROM discussion_reactions
         WHERE discussion_id = ?
           AND reaction_type = 'like'
       )
       WHERE id = ?`,
    )
    .run(postId, postId);
}

export async function setDiscussionLike(params: {
  actor: SessionUser;
  liked: boolean;
  postId: string;
}) {
  assertCanSetDiscussionLike(params.actor);

  const existingDiscussion = await findDiscussionById(params.postId, params.actor);

  if (!existingDiscussion) {
    throw new DiscussionRepositoryError("Обсуждение не найдено.", {
      status: 404,
    });
  }

  const timestamp = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    if (params.liked) {
      await execAuthPostgres(
        `INSERT INTO discussion_reactions (
          id,
          discussion_id,
          user_id,
          reaction_type,
          created_at
        )
        VALUES ($1, $2, $3, 'like', $4)
        ON CONFLICT (discussion_id, user_id, reaction_type) DO NOTHING`,
        [randomUUID(), params.postId, params.actor.id, timestamp],
      );
    } else {
      await execAuthPostgres(
        `DELETE FROM discussion_reactions
         WHERE discussion_id = $1
           AND user_id = $2
           AND reaction_type = 'like'`,
        [params.postId, params.actor.id],
      );
    }
  } else if (params.liked) {
    getDatabase()
      .prepare(
        `INSERT OR IGNORE INTO discussion_reactions (
          id,
          discussion_id,
          user_id,
          reaction_type,
          created_at
        )
        VALUES (?, ?, ?, 'like', ?)`,
      )
      .run(randomUUID(), params.postId, params.actor.id, timestamp);
  } else {
    getDatabase()
      .prepare(
        `DELETE FROM discussion_reactions
         WHERE discussion_id = ?
           AND user_id = ?
           AND reaction_type = 'like'`,
      )
      .run(params.postId, params.actor.id);
  }

  await syncDiscussionLikesCount(params.postId);

  const updatedDiscussion = await findDiscussionById(params.postId, params.actor);

  if (!updatedDiscussion) {
    throw new DiscussionRepositoryError("Не удалось загрузить обсуждение после обновления лайка.", {
      status: 500,
    });
  }

  return updatedDiscussion;
}

export async function updateDiscussion(postId: string, input: DiscussionMutationInput) {
  const existingDiscussion = await findDiscussionById(postId, input.author);

  if (!existingDiscussion) {
    throw new DiscussionRepositoryError("Обсуждение не найдено.", {
      status: 404,
    });
  }

  if (existingDiscussion.author.id !== input.author.id) {
    throw new DiscussionRepositoryError("Редактировать можно только свои обсуждения.", {
      status: 403,
    });
  }

  const prepared = prepareDiscussionRecord(input);
  const updatedAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussions
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
  } else {
    getDatabase()
      .prepare(
        `UPDATE discussions
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
  }

  const updatedDiscussion = await findDiscussionById(postId, input.author);

  if (!updatedDiscussion) {
    throw new DiscussionRepositoryError("Не удалось загрузить обновлённое обсуждение.", {
      status: 500,
    });
  }

  return updatedDiscussion;
}
