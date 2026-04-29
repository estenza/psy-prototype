import "server-only";

import { execAuthPostgres, isPostgresAuthEnabled, queryAuthPostgres } from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import type { IgnoredAuthorSummary, UserRole } from "@/features/auth/types";

type IgnoredAuthorRow = {
  avatar_url: string | null;
  display_name: string;
  id: string;
  ignored_at: string;
  nickname: string | null;
  role: UserRole | null;
};

export class IgnoredAuthorRepositoryError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "IgnoredAuthorRepositoryError";
    this.status = status;
  }
}

function readIgnoredAuthorRow(result: Record<string, unknown> | undefined | null) {
  if (!result) {
    return null;
  }

  return result as unknown as IgnoredAuthorRow;
}

function mapIgnoredAuthor(row: IgnoredAuthorRow): IgnoredAuthorSummary {
  const handle = row.nickname ? `@${row.nickname}` : `@${row.display_name}`;

  return {
    avatarUrl: row.avatar_url,
    handle,
    id: row.id,
    ignoredAt: row.ignored_at,
    name: row.display_name,
    role: row.role,
  };
}

async function queryPgRows<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const result = await queryAuthPostgres<T>(query, values);
  return result.rows;
}

async function queryPgOne<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const rows = await queryPgRows<T>(query, values);
  return rows[0] ?? null;
}

async function findUserForIgnore(ignoredUserId: string, ignoredAt: string) {
  if (isPostgresAuthEnabled()) {
    return readIgnoredAuthorRow(
      await queryPgOne<IgnoredAuthorRow>(
        `SELECT
          id,
          display_name,
          nickname,
          avatar_url,
          role,
          $2::text AS ignored_at
        FROM users
        WHERE id = $1
        LIMIT 1`,
        [ignoredUserId, ignoredAt],
      ),
    );
  }

  return readIgnoredAuthorRow(
    getDatabase()
      .prepare(
        `SELECT
          id,
          display_name,
          nickname,
          avatar_url,
          role,
          ? AS ignored_at
        FROM users
        WHERE id = ?
        LIMIT 1`,
      )
      .get(ignoredAt, ignoredUserId),
  );
}

export async function listIgnoredAuthors(userId: string) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<IgnoredAuthorRow>(
      `SELECT
        users.id,
        users.display_name,
        users.nickname,
        users.avatar_url,
        users.role,
        user_ignored_authors.created_at::text AS ignored_at
      FROM user_ignored_authors
      INNER JOIN users ON users.id = user_ignored_authors.ignored_user_id
      WHERE user_ignored_authors.user_id = $1
      ORDER BY user_ignored_authors.created_at DESC`,
      [userId],
    );

    return rows.map(mapIgnoredAuthor);
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        users.id,
        users.display_name,
        users.nickname,
        users.avatar_url,
        users.role,
        user_ignored_authors.created_at AS ignored_at
      FROM user_ignored_authors
      INNER JOIN users ON users.id = user_ignored_authors.ignored_user_id
      WHERE user_ignored_authors.user_id = ?
      ORDER BY user_ignored_authors.created_at DESC`,
    )
    .all(userId) as IgnoredAuthorRow[];

  return rows.map(mapIgnoredAuthor);
}

export async function ignoreAuthor(userId: string, ignoredUserId: string) {
  if (userId === ignoredUserId) {
    throw new IgnoredAuthorRepositoryError("Нельзя игнорировать свой профиль.");
  }

  const timestamp = new Date().toISOString();
  const ignoredAuthor = await findUserForIgnore(ignoredUserId, timestamp);

  if (!ignoredAuthor) {
    throw new IgnoredAuthorRepositoryError("Автор не найден.", 404);
  }

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `INSERT INTO user_ignored_authors (
        user_id,
        ignored_user_id,
        created_at
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, ignored_user_id) DO NOTHING`,
      [userId, ignoredUserId, timestamp],
    );

    return mapIgnoredAuthor(ignoredAuthor);
  }

  getDatabase()
    .prepare(
      `INSERT OR IGNORE INTO user_ignored_authors (
        user_id,
        ignored_user_id,
        created_at
      )
      VALUES (?, ?, ?)`,
    )
    .run(userId, ignoredUserId, timestamp);

  return mapIgnoredAuthor(ignoredAuthor);
}

export async function unignoreAuthor(userId: string, ignoredUserId: string) {
  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `DELETE FROM user_ignored_authors
       WHERE user_id = $1
         AND ignored_user_id = $2`,
      [userId, ignoredUserId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `DELETE FROM user_ignored_authors
       WHERE user_id = ?
         AND ignored_user_id = ?`,
    )
    .run(userId, ignoredUserId);
}
