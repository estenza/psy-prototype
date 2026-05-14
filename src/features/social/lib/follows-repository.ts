import "server-only";

import {
  isPostgresAuthEnabled,
  queryAuthPostgres,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { enqueueDomainEvent } from "@/lib/domain-events/outbox";
import { runStorageUnitOfWork } from "@/lib/unit-of-work";
import { findUserById } from "@/features/auth/lib/auth-repository";
import { canUsePublicActivity } from "@/features/auth/lib/permissions";
import type {
  AuthorFollowListUser,
  AuthorFollowSummary,
  SessionUser,
  SpecialistStatus,
  UserRole,
} from "@/features/auth/types";

type BooleanLike = boolean | number | null;

type FollowListUserRow = {
  avatar_url: string | null;
  display_name: string;
  id: string;
  nickname: string | null;
  role: UserRole;
  specialist_status: SpecialistStatus;
};

export class FollowRepositoryError extends Error {
  readonly status: number;

  constructor(message: string, options?: { status?: number }) {
    super(message);
    this.name = "FollowRepositoryError";
    this.status = options?.status ?? 400;
  }
}

function readBoolean(value: BooleanLike | undefined) {
  return value === true || value === 1;
}

function mapFollowListUser(row: FollowListUserRow): AuthorFollowListUser {
  return {
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    id: row.id,
    nickname: row.nickname,
    role: row.role,
    specialistStatus: row.specialist_status,
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

async function assertActorCanFollow(actor: SessionUser) {
  if (actor.isBanned) {
    throw new FollowRepositoryError("Заблокированный аккаунт не может оформлять подписки.", {
      status: 403,
    });
  }

  if (!canUsePublicActivity(actor)) {
    throw new FollowRepositoryError(
      "Активность для специалистов доступна только после верификации.",
      {
        status: 403,
      },
    );
  }
}

async function assertFollowedUserExists(followedUserId: string) {
  const followedUser = await findUserById(followedUserId);

  if (!followedUser) {
    throw new FollowRepositoryError("Автор не найден.", {
      status: 404,
    });
  }
}

async function assertPostExists(postId: string) {
  if (isPostgresAuthEnabled()) {
    const row = await queryPgOne<{ id: string }>(
      `SELECT id
       FROM posts
       WHERE id = $1
       LIMIT 1`,
      [postId],
    );

    if (!row) {
      throw new FollowRepositoryError("Пост не найден.", {
        status: 404,
      });
    }

    return;
  }

  const row = getDatabase()
    .prepare(
      `SELECT id
       FROM posts
       WHERE id = ?
       LIMIT 1`,
    )
    .get(postId) as { id: string } | undefined;

  if (!row) {
    throw new FollowRepositoryError("Пост не найден.", {
      status: 404,
    });
  }
}

export async function setAuthorFollow(params: {
  actor: SessionUser;
  followedUserId: string;
  following: boolean;
}) {
  await assertActorCanFollow(params.actor);

  if (params.actor.id === params.followedUserId) {
    throw new FollowRepositoryError("Нельзя подписаться на свой профиль.");
  }

  await assertFollowedUserExists(params.followedUserId);

  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      if (params.following) {
        const result = await unitOfWork.transaction.query(
          `INSERT INTO user_followed_authors (
            follower_user_id,
            followed_user_id,
            created_at
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (follower_user_id, followed_user_id) DO NOTHING
          RETURNING followed_user_id`,
          [params.actor.id, params.followedUserId, timestamp],
        );

        if (result.rowCount) {
          await enqueueDomainEvent(unitOfWork, {
            aggregateId: `${params.actor.id}:${params.followedUserId}`,
            eventType: "author.followed",
            payload: {
              actor: params.actor,
              followedUserId: params.followedUserId,
            },
          });
        }
        return;
      }

      await unitOfWork.transaction.query(
        `DELETE FROM user_followed_authors
         WHERE follower_user_id = $1
           AND followed_user_id = $2`,
        [params.actor.id, params.followedUserId],
      );
      return;
    }

    if (params.following) {
      const result = unitOfWork.database
        .prepare(
          `INSERT OR IGNORE INTO user_followed_authors (
            follower_user_id,
            followed_user_id,
            created_at
          )
          VALUES (?, ?, ?)`,
        )
        .run(params.actor.id, params.followedUserId, timestamp) as { changes?: number };

      if ((result.changes ?? 0) > 0) {
        await enqueueDomainEvent(unitOfWork, {
          aggregateId: `${params.actor.id}:${params.followedUserId}`,
          eventType: "author.followed",
          payload: {
            actor: params.actor,
            followedUserId: params.followedUserId,
          },
        });
      }
      return;
    }

    unitOfWork.database
      .prepare(
        `DELETE FROM user_followed_authors
         WHERE follower_user_id = ?
           AND followed_user_id = ?`,
      )
      .run(params.actor.id, params.followedUserId);
  });
}

export async function getAuthorFollowSummary(
  profileUserId: string,
  viewerUserId: string | null,
): Promise<AuthorFollowSummary> {
  if (isPostgresAuthEnabled()) {
    const row = await queryPgOne<{
      followers_count: string;
      following_count: string;
      viewer_following: boolean;
    }>(
      `SELECT
        (SELECT COUNT(*)::text
         FROM user_followed_authors
         WHERE followed_user_id = $1) AS followers_count,
        (SELECT COUNT(*)::text
         FROM user_followed_authors
         WHERE follower_user_id = $1) AS following_count,
        EXISTS (
          SELECT 1
          FROM user_followed_authors
          WHERE follower_user_id = $2
            AND followed_user_id = $1
        ) AS viewer_following`,
      [profileUserId, viewerUserId ?? ""],
    );

    return {
      followersCount: Number.parseInt(row?.followers_count ?? "0", 10) || 0,
      followingCount: Number.parseInt(row?.following_count ?? "0", 10) || 0,
      viewerFollowing: Boolean(row?.viewer_following),
    };
  }

  const row = getDatabase()
    .prepare(
      `SELECT
        (SELECT COUNT(*)
         FROM user_followed_authors
         WHERE followed_user_id = ?) AS followers_count,
        (SELECT COUNT(*)
         FROM user_followed_authors
         WHERE follower_user_id = ?) AS following_count,
        EXISTS (
          SELECT 1
          FROM user_followed_authors
          WHERE follower_user_id = ?
            AND followed_user_id = ?
        ) AS viewer_following`,
    )
    .get(
      profileUserId,
      profileUserId,
      viewerUserId ?? "",
      profileUserId,
    ) as
      | {
          followers_count: number;
          following_count: number;
          viewer_following: number;
        }
      | undefined;

  return {
    followersCount: row?.followers_count ?? 0,
    followingCount: row?.following_count ?? 0,
    viewerFollowing: readBoolean(row?.viewer_following ?? 0),
  };
}

export async function listAuthorFollowers(
  profileUserId: string,
): Promise<AuthorFollowListUser[]> {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<FollowListUserRow>(
      `SELECT
        users.id,
        users.display_name,
        users.nickname,
        users.avatar_url,
        users.role,
        users.specialist_status
       FROM user_followed_authors
       INNER JOIN users ON users.id = user_followed_authors.follower_user_id
       WHERE user_followed_authors.followed_user_id = $1
       ORDER BY user_followed_authors.created_at DESC
       LIMIT 100`,
      [profileUserId],
    );

    return rows.map(mapFollowListUser);
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        users.id,
        users.display_name,
        users.nickname,
        users.avatar_url,
        users.role,
        users.specialist_status
       FROM user_followed_authors
       INNER JOIN users ON users.id = user_followed_authors.follower_user_id
       WHERE user_followed_authors.followed_user_id = ?
       ORDER BY user_followed_authors.created_at DESC
       LIMIT 100`,
    )
    .all(profileUserId) as FollowListUserRow[];

  return rows.map(mapFollowListUser);
}

export async function listAuthorFollowing(
  profileUserId: string,
): Promise<AuthorFollowListUser[]> {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<FollowListUserRow>(
      `SELECT
        users.id,
        users.display_name,
        users.nickname,
        users.avatar_url,
        users.role,
        users.specialist_status
       FROM user_followed_authors
       INNER JOIN users ON users.id = user_followed_authors.followed_user_id
       WHERE user_followed_authors.follower_user_id = $1
       ORDER BY user_followed_authors.created_at DESC
       LIMIT 100`,
      [profileUserId],
    );

    return rows.map(mapFollowListUser);
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        users.id,
        users.display_name,
        users.nickname,
        users.avatar_url,
        users.role,
        users.specialist_status
       FROM user_followed_authors
       INNER JOIN users ON users.id = user_followed_authors.followed_user_id
       WHERE user_followed_authors.follower_user_id = ?
       ORDER BY user_followed_authors.created_at DESC
       LIMIT 100`,
    )
    .all(profileUserId) as FollowListUserRow[];

  return rows.map(mapFollowListUser);
}

export async function setPostFollow(params: {
  actor: SessionUser;
  following: boolean;
  postId: string;
}) {
  await assertActorCanFollow(params.actor);
  await assertPostExists(params.postId);

  const timestamp = new Date().toISOString();

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      if (params.following) {
        await unitOfWork.transaction.query(
          `INSERT INTO user_followed_posts (
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
        `DELETE FROM user_followed_posts
         WHERE user_id = $1
           AND post_id = $2`,
        [params.actor.id, params.postId],
      );
      return;
    }

    if (params.following) {
      unitOfWork.database
        .prepare(
          `INSERT OR IGNORE INTO user_followed_posts (
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
        `DELETE FROM user_followed_posts
         WHERE user_id = ?
           AND post_id = ?`,
      )
      .run(params.actor.id, params.postId);
  });
}
