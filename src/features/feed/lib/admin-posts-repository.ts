import "server-only";

import {
  isPostgresAuthEnabled,
  queryAuthPostgres,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { getUserHandle } from "@/features/auth/lib/profile";
import type {
  AdminPostStatus,
  AdminPostTimelineItem,
  AdminPostsFilters,
} from "@/features/feed/types";
import type { PostIntent, PostTopic } from "@/types/post-taxonomy";

const ADMIN_POST_STATUS_VALUES = new Set<AdminPostStatus>([
  "deleted",
  "hidden",
  "published",
]);

type AdminPostRow = {
  id: string;
  title: string;
  body_html: string;
  excerpt: string;
  intent: PostIntent;
  topic: PostTopic | null;
  subtopic: string | null;
  status: AdminPostStatus;
  hidden_reason: string | null;
  comments_count: number;
  likes_count: number;
  views_count: number;
  unchecked_reports_count: number | string;
  created_at: string;
  updated_at: string;
  hidden_at: string | null;
  deleted_at: string | null;
  author_user_id: string;
  author_display_name: string;
  author_nickname: string | null;
};

function normalizeHtmlText(content: string) {
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildUserHandle(row: {
  displayName: string;
  nickname: string | null;
}) {
  return getUserHandle({
    displayName: row.displayName,
    nickname: row.nickname,
  });
}

function mapAdminPostRow(row: AdminPostRow): AdminPostTimelineItem {
  return {
    id: row.id,
    title: row.title,
    bodyHtml: row.body_html,
    bodyText: normalizeHtmlText(row.body_html) || row.excerpt,
    excerpt: row.excerpt,
    intent: row.intent,
    topic: row.topic,
    subtopic: row.subtopic,
    status: row.status,
    hiddenReason: row.hidden_reason,
    commentsCount: row.comments_count,
    likesCount: row.likes_count,
    viewsCount: row.views_count,
    uncheckedReportsCount: Number(row.unchecked_reports_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hiddenAt: row.hidden_at,
    deletedAt: row.deleted_at,
    author: {
      id: row.author_user_id,
      name: row.author_display_name,
      handle: buildUserHandle({
        displayName: row.author_display_name,
        nickname: row.author_nickname,
      }),
    },
  };
}

export function normalizeAdminPostsFilters(input: {
  search?: string | null;
  status?: string | null;
}): AdminPostsFilters {
  const statusCandidate = input.status as AdminPostStatus | "all" | null | undefined;

  return {
    search: input.search?.trim().slice(0, 120) ?? "",
    status:
      statusCandidate && ADMIN_POST_STATUS_VALUES.has(statusCandidate as AdminPostStatus)
        ? statusCandidate as AdminPostStatus
        : "all",
  };
}

function buildAdminPostsWhere(filters: AdminPostsFilters, postgres: boolean) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const addParam = (value: unknown) => {
    params.push(value);
    return postgres ? `$${params.length}` : "?";
  };

  if (filters.status !== "all") {
    conditions.push(`posts.status = ${addParam(filters.status)}`);
  }

  if (filters.search) {
    const searchValue = `%${filters.search.toLowerCase()}%`;
    const title = addParam(searchValue);
    const excerpt = addParam(searchValue);
    const body = addParam(searchValue);
    const authorName = addParam(searchValue);
    const authorNickname = addParam(searchValue);

    conditions.push(`(
      LOWER(COALESCE(posts.title, '')) LIKE ${title}
      OR LOWER(COALESCE(posts.excerpt, '')) LIKE ${excerpt}
      OR LOWER(COALESCE(posts.body_html, '')) LIKE ${body}
      OR LOWER(users.display_name) LIKE ${authorName}
      OR LOWER(COALESCE(users.nickname, '')) LIKE ${authorNickname}
    )`);
  }

  return {
    params,
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

export async function listAdminPosts(filters: AdminPostsFilters) {
  const postgres = isPostgresAuthEnabled();
  const { params, whereClause } = buildAdminPostsWhere(filters, postgres);
  const createdAtColumn = postgres
    ? "posts.created_at::text AS created_at"
    : "posts.created_at";
  const updatedAtColumn = postgres
    ? "posts.updated_at::text AS updated_at"
    : "posts.updated_at";
  const hiddenAtColumn = postgres
    ? "posts.hidden_at::text AS hidden_at"
    : "posts.hidden_at";
  const deletedAtColumn = postgres
    ? "posts.deleted_at::text AS deleted_at"
    : "posts.deleted_at";

  const query = `
    SELECT
      posts.id,
      posts.title,
      posts.body_html,
      posts.excerpt,
      posts.intent,
      posts.topic,
      posts.subtopic,
      posts.status,
      posts.hidden_reason,
      posts.comments_count,
      posts.likes_count,
      posts.views_count,
      (
        SELECT COUNT(*)
        FROM content_reports
        WHERE content_reports.post_id = posts.id
          AND content_reports.status IN ('open', 'reviewed')
      ) AS unchecked_reports_count,
      ${createdAtColumn},
      ${updatedAtColumn},
      ${hiddenAtColumn},
      ${deletedAtColumn},
      users.id AS author_user_id,
      users.display_name AS author_display_name,
      users.nickname AS author_nickname
    FROM posts
    INNER JOIN users ON users.id = posts.author_user_id
    ${whereClause}
    ORDER BY posts.created_at DESC
    LIMIT 250
  `;

  if (postgres) {
    const result = await queryAuthPostgres<AdminPostRow>(query, params);
    return result.rows.map(mapAdminPostRow);
  }

  const rows = getDatabase().prepare(query).all(...params) as AdminPostRow[];
  return rows.map(mapAdminPostRow);
}
