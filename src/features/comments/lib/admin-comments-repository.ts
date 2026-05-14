import "server-only";

import {
  isPostgresAuthEnabled,
  queryAuthPostgres,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { getUserHandle } from "@/features/auth/lib/profile";
import type {
  AdminCommentStatus,
  AdminCommentTimelineItem,
  AdminCommentsFilters,
} from "@/features/comments/types";

const ADMIN_COMMENT_STATUS_VALUES = new Set<AdminCommentStatus>([
  "deleted",
  "hidden",
  "pending",
  "published",
]);

type AdminCommentRow = {
  id: string;
  post_id: string;
  post_title: string;
  parent_comment_id: string | null;
  root_comment_id: string | null;
  depth: number;
  body_text: string;
  status: AdminCommentStatus;
  hidden_reason: string | null;
  likes_count: number;
  replies_count: number;
  reports_count: number;
  unchecked_reports_count: number | string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  hidden_at: string | null;
  deleted_at: string | null;
  deleted_by_moderator: boolean | number;
  author_user_id: string;
  author_display_name: string;
  author_nickname: string | null;
};

function readBoolean(value: boolean | number | null | undefined) {
  return value === true || value === 1;
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

function mapAdminCommentRow(row: AdminCommentRow): AdminCommentTimelineItem {
  return {
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    parentId: row.parent_comment_id,
    rootId: row.root_comment_id ?? row.id,
    depth: row.depth,
    bodyText: row.body_text,
    status: row.status,
    hiddenReason: row.hidden_reason,
    likesCount: row.likes_count,
    repliesCount: row.replies_count,
    reportsCount: row.reports_count,
    uncheckedReportsCount: Number(row.unchecked_reports_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
    hiddenAt: row.hidden_at,
    deletedAt: row.deleted_at,
    deletedByModerator: row.status === "deleted" && readBoolean(row.deleted_by_moderator),
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

export function normalizeAdminCommentsFilters(input: {
  search?: string | null;
  status?: string | null;
}): AdminCommentsFilters {
  const statusCandidate = input.status as AdminCommentStatus | "all" | null | undefined;

  return {
    search: input.search?.trim().slice(0, 120) ?? "",
    status:
      statusCandidate && ADMIN_COMMENT_STATUS_VALUES.has(statusCandidate as AdminCommentStatus)
        ? statusCandidate as AdminCommentStatus
        : "all",
  };
}

function buildAdminCommentsWhere(filters: AdminCommentsFilters, postgres: boolean) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const addParam = (value: unknown) => {
    params.push(value);
    return postgres ? `$${params.length}` : "?";
  };

  if (filters.status !== "all") {
    conditions.push(`post_comments.status = ${addParam(filters.status)}`);
  }

  if (filters.search) {
    const searchValue = `%${filters.search.toLowerCase()}%`;
    const body = addParam(searchValue);
    const authorName = addParam(searchValue);
    const authorNickname = addParam(searchValue);
    const postTitle = addParam(searchValue);

    conditions.push(`(
      LOWER(COALESCE(post_comments.body_text, '')) LIKE ${body}
      OR LOWER(users.display_name) LIKE ${authorName}
      OR LOWER(COALESCE(users.nickname, '')) LIKE ${authorNickname}
      OR LOWER(COALESCE(posts.title, '')) LIKE ${postTitle}
    )`);
  }

  return {
    params,
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

export async function listAdminComments(filters: AdminCommentsFilters) {
  const postgres = isPostgresAuthEnabled();
  const { params, whereClause } = buildAdminCommentsWhere(filters, postgres);
  const createdAtColumn = postgres
    ? "post_comments.created_at::text AS created_at"
    : "post_comments.created_at";
  const updatedAtColumn = postgres
    ? "post_comments.updated_at::text AS updated_at"
    : "post_comments.updated_at";
  const editedAtColumn = postgres
    ? "post_comments.edited_at::text AS edited_at"
    : "post_comments.edited_at";
  const hiddenAtColumn = postgres
    ? "post_comments.hidden_at::text AS hidden_at"
    : "post_comments.hidden_at";
  const deletedAtColumn = postgres
    ? "post_comments.deleted_at::text AS deleted_at"
    : "post_comments.deleted_at";

  const query = `
    SELECT
      post_comments.id,
      post_comments.post_id,
      posts.title AS post_title,
      post_comments.parent_comment_id,
      post_comments.root_comment_id,
      post_comments.depth,
      post_comments.body_text,
      post_comments.status,
      post_comments.hidden_reason,
      post_comments.likes_count,
      post_comments.replies_count,
      post_comments.reports_count,
      (
        SELECT COUNT(*)
        FROM content_reports
        WHERE content_reports.comment_id = post_comments.id
          AND content_reports.status IN ('open', 'reviewed')
      ) AS unchecked_reports_count,
      ${createdAtColumn},
      ${updatedAtColumn},
      ${editedAtColumn},
      ${hiddenAtColumn},
      ${deletedAtColumn},
      EXISTS (
        SELECT 1
        FROM content_reports
        WHERE content_reports.comment_id = post_comments.id
          AND content_reports.status = 'action_taken'
      ) AS deleted_by_moderator,
      users.id AS author_user_id,
      users.display_name AS author_display_name,
      users.nickname AS author_nickname
    FROM post_comments
    INNER JOIN posts ON posts.id = post_comments.post_id
    INNER JOIN users ON users.id = post_comments.author_user_id
    ${whereClause}
    ORDER BY post_comments.created_at DESC
    LIMIT 250
  `;

  if (postgres) {
    const result = await queryAuthPostgres<AdminCommentRow>(query, params);
    return result.rows.map(mapAdminCommentRow);
  }

  const rows = getDatabase().prepare(query).all(...params) as AdminCommentRow[];
  return rows.map(mapAdminCommentRow);
}
