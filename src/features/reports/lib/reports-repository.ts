import "server-only";

import { randomUUID } from "node:crypto";
import {
  isPostgresAuthEnabled,
  queryAuthPostgres,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { runStorageUnitOfWork } from "@/lib/unit-of-work";
import { canUsePublicActivity } from "@/features/auth/lib/permissions";
import { getUserHandle } from "@/features/auth/lib/profile";
import type { SessionUser } from "@/features/auth/types";
import { findPostById } from "@/features/feed/lib/posts-repository";
import { isContentReportReason } from "@/features/reports/lib/report-copy";
import type {
  AdminReportItem,
  AdminReportsUncheckedCounts,
  AdminReportsFilters,
  ContentReportReason,
  ContentReportStatus,
} from "@/features/reports/types";

type ContentReportRow = {
  id: string;
  created_at: string;
  updated_at: string;
  object_type: "comment" | "post";
  object_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: ContentReportReason;
  details: string | null;
  status: ContentReportStatus;
  content_status: string | null;
  content_fragment: string | null;
  reporter_user_id: string;
  reporter_display_name: string;
  reporter_nickname: string | null;
  content_author_user_id: string;
  content_author_display_name: string;
  content_author_nickname: string | null;
};

const REPORT_DETAILS_MAX_LENGTH = 1000;

export class ReportsRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportsRepositoryError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function normalizeDetails(value: string | null | undefined) {
  const details = value?.trim() ?? "";

  if (!details) {
    return null;
  }

  if (details.length > REPORT_DETAILS_MAX_LENGTH) {
    throw new ReportsRepositoryError(
      `Текст жалобы должен быть не длиннее ${REPORT_DETAILS_MAX_LENGTH} символов.`,
      400,
    );
  }

  return details;
}

function trimFragment(value: string | null | undefined) {
  const normalizedValue = (value ?? "").replace(/\s+/g, " ").trim();

  if (normalizedValue.length <= 220) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 219).trimEnd()}…`;
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

function mapReportRow(row: ContentReportRow): AdminReportItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    objectType: row.object_type,
    objectId: row.object_id,
    postId: row.post_id,
    commentId: row.comment_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    contentStatus: row.content_status,
    contentFragment: trimFragment(row.content_fragment),
    reporter: {
      id: row.reporter_user_id,
      name: row.reporter_display_name,
      handle: buildUserHandle({
        displayName: row.reporter_display_name,
        nickname: row.reporter_nickname,
      }),
    },
    contentAuthor: {
      id: row.content_author_user_id,
      name: row.content_author_display_name,
      handle: buildUserHandle({
        displayName: row.content_author_display_name,
        nickname: row.content_author_nickname,
      }),
    },
  };
}

async function queryPgRows<T extends Record<string, unknown>>(
  query: string,
  values: unknown[] = [],
) {
  const result = await queryAuthPostgres<T>(query, values);
  return result.rows;
}

function buildReportFiltersWhere(filters: AdminReportsFilters, postgres: boolean) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const addParam = (value: unknown) => {
    params.push(value);
    return postgres ? `$${params.length}` : "?";
  };

  if (filters.status !== "all") {
    conditions.push(`content_reports.status = ${addParam(filters.status)}`);
  }

  if (filters.objectType !== "all") {
    conditions.push(`content_reports.object_type = ${addParam(filters.objectType)}`);
  }

  if (filters.reason !== "all") {
    conditions.push(`content_reports.reason = ${addParam(filters.reason)}`);
  }

  if (filters.search) {
    const searchValue = `%${filters.search.toLowerCase()}%`;
    const reporterName = addParam(searchValue);
    const reporterNickname = addParam(searchValue);
    const authorName = addParam(searchValue);
    const authorNickname = addParam(searchValue);
    const postTitle = addParam(searchValue);
    const postExcerpt = addParam(searchValue);
    const commentBody = addParam(searchValue);
    const details = addParam(searchValue);
    conditions.push(`(
      LOWER(reporters.display_name) LIKE ${reporterName}
      OR LOWER(COALESCE(reporters.nickname, '')) LIKE ${reporterNickname}
      OR LOWER(content_authors.display_name) LIKE ${authorName}
      OR LOWER(COALESCE(content_authors.nickname, '')) LIKE ${authorNickname}
      OR LOWER(COALESCE(posts.title, '')) LIKE ${postTitle}
      OR LOWER(COALESCE(posts.excerpt, '')) LIKE ${postExcerpt}
      OR LOWER(COALESCE(post_comments.body_text, '')) LIKE ${commentBody}
      OR LOWER(COALESCE(content_reports.details, '')) LIKE ${details}
    )`);
  }

  return {
    params,
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

export async function createPostReport(params: {
  actor: SessionUser;
  details?: string | null;
  postId: string;
  reason: ContentReportReason;
}) {
  if (params.actor.isBanned) {
    throw new ReportsRepositoryError("Жалобы для этого аккаунта временно недоступны.", 403);
  }

  if (!canUsePublicActivity(params.actor)) {
    throw new ReportsRepositoryError(
      "Активность для специалистов доступна только после верификации.",
      403,
    );
  }

  if (!isContentReportReason(params.reason)) {
    throw new ReportsRepositoryError("Выберите причину жалобы.", 400);
  }

  const post = await findPostById(params.postId, params.actor);

  if (!post) {
    throw new ReportsRepositoryError("Пост не найден.", 404);
  }

  if (post.author.id === params.actor.id) {
    throw new ReportsRepositoryError("Нельзя пожаловаться на свой пост.", 409);
  }

  const details = normalizeDetails(params.details);
  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `INSERT INTO content_reports (
          id,
          object_type,
          object_id,
          post_id,
          comment_id,
          reporter_user_id,
          content_author_user_id,
          reason,
          details,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, 'post', $2, $3, NULL, $4, $5, $6, $7, 'open', $8, $9)
        ON CONFLICT (object_type, object_id, reporter_user_id)
        DO UPDATE SET
          reason = EXCLUDED.reason,
          details = EXCLUDED.details,
          status = 'open',
          updated_at = EXCLUDED.updated_at,
          resolved_at = NULL,
          resolved_by_user_id = NULL`,
        [
          randomUUID(),
          params.postId,
          params.postId,
          params.actor.id,
          post.author.id,
          params.reason,
          details,
          timestamp,
          timestamp,
        ],
      );
      return;
    }

    unitOfWork.database
      .prepare(
        `INSERT INTO content_reports (
          id,
          object_type,
          object_id,
          post_id,
          comment_id,
          reporter_user_id,
          content_author_user_id,
          reason,
          details,
          status,
          created_at,
          updated_at
        )
        VALUES (?, 'post', ?, ?, NULL, ?, ?, ?, ?, 'open', ?, ?)
        ON CONFLICT(object_type, object_id, reporter_user_id)
        DO UPDATE SET
          reason = excluded.reason,
          details = excluded.details,
          status = 'open',
          updated_at = excluded.updated_at,
          resolved_at = NULL,
          resolved_by_user_id = NULL`,
      )
      .run(
        randomUUID(),
        params.postId,
        params.postId,
        params.actor.id,
        post.author.id,
        params.reason,
        details,
        timestamp,
        timestamp,
      );
  });
}

export async function listContentReports(filters: AdminReportsFilters) {
  const postgres = isPostgresAuthEnabled();
  const { params, whereClause } = buildReportFiltersWhere(filters, postgres);
  const createdAtColumn = postgres
    ? "content_reports.created_at::text AS created_at"
    : "content_reports.created_at";
  const updatedAtColumn = postgres
    ? "content_reports.updated_at::text AS updated_at"
    : "content_reports.updated_at";

  const query = `
    SELECT
      content_reports.id,
      ${createdAtColumn},
      ${updatedAtColumn},
      content_reports.object_type,
      content_reports.object_id,
      content_reports.post_id,
      content_reports.comment_id,
      content_reports.reason,
      content_reports.details,
      content_reports.status,
      CASE
        WHEN content_reports.object_type = 'post' THEN posts.status
        ELSE post_comments.status
      END AS content_status,
      CASE
        WHEN content_reports.object_type = 'post' THEN posts.excerpt
        ELSE post_comments.body_text
      END AS content_fragment,
      reporters.id AS reporter_user_id,
      reporters.display_name AS reporter_display_name,
      reporters.nickname AS reporter_nickname,
      content_authors.id AS content_author_user_id,
      content_authors.display_name AS content_author_display_name,
      content_authors.nickname AS content_author_nickname
    FROM content_reports
    INNER JOIN users AS reporters
      ON reporters.id = content_reports.reporter_user_id
    INNER JOIN users AS content_authors
      ON content_authors.id = content_reports.content_author_user_id
    LEFT JOIN posts
      ON posts.id = content_reports.post_id
    LEFT JOIN post_comments
      ON post_comments.id = content_reports.comment_id
    ${whereClause}
    ORDER BY content_reports.created_at DESC
  `;

  if (postgres) {
    const rows = await queryPgRows<ContentReportRow>(query, params);
    return rows.map(mapReportRow);
  }

  const rows = getDatabase().prepare(query).all(...params) as ContentReportRow[];
  return rows.map(mapReportRow);
}

export async function countUncheckedContentReportsByType(): Promise<AdminReportsUncheckedCounts> {
  const postgres = isPostgresAuthEnabled();
  const query = `
    SELECT object_type, COUNT(*) AS count
    FROM content_reports
    WHERE status IN (${postgres ? "$1, $2" : "?, ?"})
    GROUP BY object_type
  `;
  const counts = {
    comment: 0,
    post: 0,
  };

  if (postgres) {
    const rows = await queryPgRows<{
      count: string;
      object_type: "comment" | "post";
    }>(query, ["open", "reviewed"]);

    rows.forEach((row) => {
      counts[row.object_type] = Number(row.count ?? 0);
    });
  } else {
    const rows = getDatabase()
      .prepare(query)
      .all("open", "reviewed") as Array<{
        count: number;
        object_type: "comment" | "post";
      }>;

    rows.forEach((row) => {
      counts[row.object_type] = row.count;
    });
  }

  return {
    ...counts,
    total: counts.comment + counts.post,
  };
}

export async function updateContentReportStatus(params: {
  actor: SessionUser;
  reportId: string;
  status: ContentReportStatus;
}) {
  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `UPDATE content_reports
         SET status = $1,
             updated_at = $2,
             resolved_at = CASE
               WHEN $1 = 'open' THEN NULL
               WHEN resolved_at IS NULL THEN $3::timestamptz
               ELSE resolved_at
             END,
             resolved_by_user_id = CASE
               WHEN $1 = 'open' THEN NULL
               WHEN resolved_by_user_id IS NULL THEN $4
               ELSE resolved_by_user_id
             END
         WHERE id = $5`,
        [params.status, timestamp, timestamp, params.actor.id, params.reportId],
      );
      return;
    }

    unitOfWork.database
      .prepare(
        `UPDATE content_reports
         SET status = ?,
             updated_at = ?,
             resolved_at = CASE
               WHEN ? = 'open' THEN NULL
               WHEN resolved_at IS NULL THEN ?
               ELSE resolved_at
             END,
             resolved_by_user_id = CASE
               WHEN ? = 'open' THEN NULL
               WHEN resolved_by_user_id IS NULL THEN ?
               ELSE resolved_by_user_id
             END
         WHERE id = ?`,
      )
      .run(
        params.status,
        timestamp,
        params.status,
        timestamp,
        params.status,
        params.actor.id,
        params.reportId,
      );
  });
}

export async function findContentReportById(reportId: string) {
  const filters: AdminReportsFilters = {
    objectType: "all",
    reason: "all",
    search: "",
    status: "all",
  };
  const postgres = isPostgresAuthEnabled();
  const placeholder = postgres ? "$1" : "?";
  const base = await listContentReports(filters);

  // The list query keeps all joins and mapping in one place; narrow locally for the MVP.
  // A dedicated SELECT can replace this if the moderation queue grows.
  const report = base.find((item) => item.id === reportId);

  if (!report) {
    void placeholder;
    throw new ReportsRepositoryError("Жалоба не найдена.", 404);
  }

  return report;
}
