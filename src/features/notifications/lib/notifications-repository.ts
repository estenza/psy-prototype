import "server-only";

import { randomUUID } from "node:crypto";
import { execAuthPostgres, isPostgresAuthEnabled, queryAuthPostgres } from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { buildPublicProfilePathFromHandle, getUserHandle } from "@/features/auth/lib/profile";
import type {
  NotificationKind,
  NotificationPreferences,
  SessionUser,
  UserNotification,
} from "@/features/auth/types";

type BooleanLike = boolean | number | null;

type NotificationPreferencesRow = {
  post_replies_enabled: BooleanLike;
  direct_replies_enabled: BooleanLike;
  followed_post_replies_enabled: BooleanLike;
  followed_author_posts_enabled: BooleanLike;
  system_messages_enabled: BooleanLike;
};

type NotificationRow = {
  id: string;
  type: NotificationKind;
  title: string;
  body: string | null;
  href: string;
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
  actor_display_name: string | null;
  actor_nickname: string | null;
  actor_avatar_url: string | null;
};

type PostNotificationContextRow = {
  author_user_id: string;
  title: string;
};

type CommentNotificationContextRow = {
  author_user_id: string;
  post_id: string;
  parent_comment_id: string | null;
};

type UserRecipientRow = {
  user_id: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  postReplies: true,
  directReplies: true,
  followedPostReplies: true,
  followedAuthorPosts: true,
  systemMessages: true,
};

const NOTIFICATION_LIMIT = 30;

function readBoolean(value: BooleanLike | undefined) {
  return value === true || value === 1;
}

function mapPreferences(row: NotificationPreferencesRow | null): NotificationPreferences {
  if (!row) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    postReplies: readBoolean(row.post_replies_enabled),
    directReplies: readBoolean(row.direct_replies_enabled),
    followedPostReplies: readBoolean(row.followed_post_replies_enabled),
    followedAuthorPosts: readBoolean(row.followed_author_posts_enabled),
    systemMessages: readBoolean(row.system_messages_enabled),
  };
}

function toDatabaseBoolean(value: boolean) {
  return isPostgresAuthEnabled() ? value : value ? 1 : 0;
}

async function queryPgRows<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const result = await queryAuthPostgres<T>(query, values);
  return result.rows;
}

async function queryPgOne<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const rows = await queryPgRows<T>(query, values);
  return rows[0] ?? null;
}

function buildPostHref(postId: string, commentIds: string[] = []) {
  const normalizedCommentIds = [...new Set(commentIds.map((id) => id.trim()).filter(Boolean))];

  if (normalizedCommentIds.length === 0) {
    return `/posts/${postId}`;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("commentIds", normalizedCommentIds.join(","));

  return `/posts/${postId}?${searchParams.toString()}`;
}

function mapNotification(row: NotificationRow, href: string): UserNotification {
  const actorHandle = row.actor_display_name
    ? getUserHandle({
        displayName: row.actor_display_name,
        nickname: row.actor_nickname,
      })
    : null;

  return {
    actorAvatarUrl: row.actor_avatar_url,
    actorHandle,
    actorName: row.actor_display_name,
    body: row.body,
    createdAt: row.created_at,
    href,
    id: row.id,
    isRead: Boolean(row.read_at),
    title: row.title,
    type: row.type,
  };
}

export async function getNotificationPreferences(userId: string) {
  if (isPostgresAuthEnabled()) {
    const row = await queryPgOne<NotificationPreferencesRow>(
      `SELECT
        post_replies_enabled,
        direct_replies_enabled,
        followed_post_replies_enabled,
        followed_author_posts_enabled,
        system_messages_enabled
      FROM user_notification_preferences
      WHERE user_id = $1
      LIMIT 1`,
      [userId],
    );

    return mapPreferences(row);
  }

  const row = getDatabase()
    .prepare(
      `SELECT
        post_replies_enabled,
        direct_replies_enabled,
        followed_post_replies_enabled,
        followed_author_posts_enabled,
        system_messages_enabled
      FROM user_notification_preferences
      WHERE user_id = ?
      LIMIT 1`,
    )
    .get(userId) as NotificationPreferencesRow | undefined;

  return mapPreferences(row ?? null);
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
) {
  const currentPreferences = await getNotificationPreferences(userId);
  const nextPreferences = {
    ...currentPreferences,
    ...preferences,
  };
  const updatedAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `INSERT INTO user_notification_preferences (
        user_id,
        post_replies_enabled,
        direct_replies_enabled,
        followed_post_replies_enabled,
        followed_author_posts_enabled,
        system_messages_enabled,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        post_replies_enabled = EXCLUDED.post_replies_enabled,
        direct_replies_enabled = EXCLUDED.direct_replies_enabled,
        followed_post_replies_enabled = EXCLUDED.followed_post_replies_enabled,
        followed_author_posts_enabled = EXCLUDED.followed_author_posts_enabled,
        system_messages_enabled = EXCLUDED.system_messages_enabled,
        updated_at = EXCLUDED.updated_at`,
      [
        userId,
        nextPreferences.postReplies,
        nextPreferences.directReplies,
        nextPreferences.followedPostReplies,
        nextPreferences.followedAuthorPosts,
        nextPreferences.systemMessages,
        updatedAt,
      ],
    );

    return nextPreferences;
  }

  getDatabase()
    .prepare(
      `INSERT INTO user_notification_preferences (
        user_id,
        post_replies_enabled,
        direct_replies_enabled,
        followed_post_replies_enabled,
        followed_author_posts_enabled,
        system_messages_enabled,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        post_replies_enabled = excluded.post_replies_enabled,
        direct_replies_enabled = excluded.direct_replies_enabled,
        followed_post_replies_enabled = excluded.followed_post_replies_enabled,
        followed_author_posts_enabled = excluded.followed_author_posts_enabled,
        system_messages_enabled = excluded.system_messages_enabled,
        updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      toDatabaseBoolean(nextPreferences.postReplies),
      toDatabaseBoolean(nextPreferences.directReplies),
      toDatabaseBoolean(nextPreferences.followedPostReplies),
      toDatabaseBoolean(nextPreferences.followedAuthorPosts),
      toDatabaseBoolean(nextPreferences.systemMessages),
      updatedAt,
    );

  return nextPreferences;
}

async function insertNotification(input: {
  actorUserId: string | null;
  body?: string | null;
  commentId?: string | null;
  dedupeKey: string;
  href: string;
  postId?: string | null;
  recipientUserId: string;
  title: string;
  type: NotificationKind;
}) {
  if (input.actorUserId && input.actorUserId === input.recipientUserId) {
    return;
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `INSERT INTO user_notifications (
        id,
        recipient_user_id,
        actor_user_id,
        type,
        post_id,
        comment_id,
        title,
        body,
        href,
        dedupe_key,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (recipient_user_id, dedupe_key) DO NOTHING`,
      [
        id,
        input.recipientUserId,
        input.actorUserId,
        input.type,
        input.postId ?? null,
        input.commentId ?? null,
        input.title,
        input.body ?? null,
        input.href,
        input.dedupeKey,
        createdAt,
      ],
    );
    return;
  }

  getDatabase()
    .prepare(
      `INSERT OR IGNORE INTO user_notifications (
        id,
        recipient_user_id,
        actor_user_id,
        type,
        post_id,
        comment_id,
        title,
        body,
        href,
        dedupe_key,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.recipientUserId,
      input.actorUserId,
      input.type,
      input.postId ?? null,
      input.commentId ?? null,
      input.title,
      input.body ?? null,
      input.href,
      input.dedupeKey,
      createdAt,
    );
}

async function findPostNotificationContext(postId: string) {
  if (isPostgresAuthEnabled()) {
    return await queryPgOne<PostNotificationContextRow>(
      `SELECT author_user_id, title
       FROM posts
       WHERE id = $1
       LIMIT 1`,
      [postId],
    );
  }

  return (getDatabase()
    .prepare(
      `SELECT author_user_id, title
       FROM posts
       WHERE id = ?
       LIMIT 1`,
    )
    .get(postId) as PostNotificationContextRow | undefined) ?? null;
}

async function findCommentNotificationContext(commentId: string) {
  if (isPostgresAuthEnabled()) {
    return await queryPgOne<CommentNotificationContextRow>(
      `SELECT author_user_id, post_id, parent_comment_id
       FROM post_comments
       WHERE id = $1
       LIMIT 1`,
      [commentId],
    );
  }

  return (getDatabase()
    .prepare(
      `SELECT author_user_id, post_id, parent_comment_id
       FROM post_comments
       WHERE id = ?
       LIMIT 1`,
    )
    .get(commentId) as CommentNotificationContextRow | undefined) ?? null;
}

async function listRecipientsForPreference(
  preferenceColumn: keyof NotificationPreferencesRow,
  query: {
    pg: string;
    sqlite: string;
    values: unknown[];
  },
) {
  const preferencePredicate = `preferences.${String(preferenceColumn)} IS NOT FALSE`;

  if (isPostgresAuthEnabled()) {
    return await queryPgRows<UserRecipientRow>(
      query.pg.replace("__PREFERENCE_PREDICATE__", preferencePredicate),
      query.values,
    );
  }

  return getDatabase()
    .prepare(
      query.sqlite.replace(
        "__PREFERENCE_PREDICATE__",
        `(preferences.${String(preferenceColumn)} IS NULL OR preferences.${String(preferenceColumn)} != 0)`,
      ),
    )
    .all(...query.values) as UserRecipientRow[];
}

export async function createPostPublishedNotifications(params: {
  actor: SessionUser;
  postId: string;
  title: string;
}) {
  const actorHandle = getUserHandle(params.actor);
  const recipients = await listRecipientsForPreference(
    "followed_author_posts_enabled",
    {
      pg: `SELECT followed.follower_user_id AS user_id
        FROM user_followed_authors AS followed
        LEFT JOIN user_notification_preferences AS preferences
          ON preferences.user_id = followed.follower_user_id
        WHERE followed.followed_user_id = $1
          AND followed.follower_user_id <> $1
          AND __PREFERENCE_PREDICATE__`,
      sqlite: `SELECT followed.follower_user_id AS user_id
        FROM user_followed_authors AS followed
        LEFT JOIN user_notification_preferences AS preferences
          ON preferences.user_id = followed.follower_user_id
        WHERE followed.followed_user_id = ?
          AND followed.follower_user_id <> ?
          AND __PREFERENCE_PREDICATE__`,
      values: isPostgresAuthEnabled()
        ? [params.actor.id]
        : [params.actor.id, params.actor.id],
    },
  );

  await Promise.all(
    recipients.map((recipient) =>
      insertNotification({
        actorUserId: params.actor.id,
        body: params.title,
        dedupeKey: `followed-author-post:${params.postId}`,
        href: buildPostHref(params.postId),
        postId: params.postId,
        recipientUserId: recipient.user_id,
        title: `Новый пост от ${actorHandle}`,
        type: "followed_author_post",
      }),
    ),
  );
}

export async function createAuthorFollowedNotification(params: {
  actor: SessionUser;
  followedUserId: string;
}) {
  const preferences = await getNotificationPreferences(params.followedUserId);

  if (!preferences.systemMessages) {
    return;
  }

  const actorHandle = getUserHandle(params.actor);

  await insertNotification({
    actorUserId: params.actor.id,
    body: null,
    dedupeKey: `author-followed:${params.actor.id}`,
    href: buildPublicProfilePathFromHandle(actorHandle) ?? "/profile",
    recipientUserId: params.followedUserId,
    title: `${actorHandle} подписался на вас`,
    type: "system",
  });
}

export async function createCommentNotifications(params: {
  actor: SessionUser;
  commentId: string;
  parentCommentId: string | null;
  postId: string;
}) {
  const post = await findPostNotificationContext(params.postId);

  if (!post) {
    return;
  }

  const actorHandle = getUserHandle(params.actor);
  const href = buildPostHref(params.postId, [params.commentId]);
  const notifiedRecipients = new Set<string>();

  const notify = async (
    recipientUserId: string,
    input: {
      body: string | null;
      dedupeKey: string;
      title: string;
      type: NotificationKind;
    },
  ) => {
    if (recipientUserId === params.actor.id || notifiedRecipients.has(recipientUserId)) {
      return;
    }

    notifiedRecipients.add(recipientUserId);
    await insertNotification({
      actorUserId: params.actor.id,
      body: input.body,
      commentId: params.commentId,
      dedupeKey: input.dedupeKey,
      href,
      postId: params.postId,
      recipientUserId,
      title: input.title,
      type: input.type,
    });
  };

  if (post.author_user_id !== params.actor.id) {
    const preferences = await getNotificationPreferences(post.author_user_id);

    if (preferences.postReplies) {
      await notify(post.author_user_id, {
        body: post.title,
        dedupeKey: `post-reply:${params.commentId}`,
        title: `Новый комментарий от ${actorHandle}`,
        type: "post_reply",
      });
    }
  }

  if (params.parentCommentId) {
    const parentComment = await findCommentNotificationContext(params.parentCommentId);

    if (parentComment && parentComment.author_user_id !== params.actor.id) {
      const preferences = await getNotificationPreferences(parentComment.author_user_id);

      if (preferences.directReplies) {
        await notify(parentComment.author_user_id, {
          body: post.title,
          dedupeKey: `direct-reply:${params.commentId}`,
          title: `Новый комментарий от ${actorHandle}`,
          type: "direct_reply",
        });
      }
    }
  }

  const bookmarkedRecipients = await listRecipientsForPreference(
    "followed_post_replies_enabled",
    {
      pg: `SELECT bookmarks.user_id
        FROM user_followed_posts AS followed_posts
        LEFT JOIN user_notification_preferences AS preferences
          ON preferences.user_id = followed_posts.user_id
        WHERE followed_posts.post_id = $1
          AND followed_posts.user_id <> $2
          AND followed_posts.user_id <> $3
          AND __PREFERENCE_PREDICATE__`,
      sqlite: `SELECT followed_posts.user_id
        FROM user_followed_posts AS followed_posts
        LEFT JOIN user_notification_preferences AS preferences
          ON preferences.user_id = followed_posts.user_id
        WHERE followed_posts.post_id = ?
          AND followed_posts.user_id <> ?
          AND followed_posts.user_id <> ?
          AND __PREFERENCE_PREDICATE__`,
      values: [params.postId, params.actor.id, post.author_user_id],
    },
  );

  await Promise.all(
    bookmarkedRecipients.map((recipient) =>
      notify(recipient.user_id, {
        body: post.title,
        dedupeKey: `followed-post-reply:${params.commentId}`,
        title: `Новый комментарий от ${actorHandle}`,
        type: "followed_post_reply",
      }),
    ),
  );
}

export async function listNotifications(userId: string) {
  const rows = isPostgresAuthEnabled()
    ? await queryPgRows<NotificationRow>(
      `SELECT
        notifications.id,
        notifications.type,
        notifications.title,
        notifications.body,
        notifications.href,
        notifications.post_id,
        notifications.comment_id,
        notifications.read_at::text AS read_at,
        notifications.created_at::text AS created_at,
        actors.display_name AS actor_display_name,
        actors.nickname AS actor_nickname,
        actors.avatar_url AS actor_avatar_url
      FROM user_notifications AS notifications
      LEFT JOIN users AS actors ON actors.id = notifications.actor_user_id
      WHERE notifications.recipient_user_id = $1
      ORDER BY notifications.created_at DESC
      LIMIT $2`,
      [userId, NOTIFICATION_LIMIT],
    )
    : getDatabase()
      .prepare(
        `SELECT
          notifications.id,
          notifications.type,
          notifications.title,
          notifications.body,
          notifications.href,
          notifications.post_id,
          notifications.comment_id,
          notifications.read_at,
          notifications.created_at,
          actors.display_name AS actor_display_name,
          actors.nickname AS actor_nickname,
          actors.avatar_url AS actor_avatar_url
        FROM user_notifications AS notifications
        LEFT JOIN users AS actors ON actors.id = notifications.actor_user_id
        WHERE notifications.recipient_user_id = ?
        ORDER BY notifications.created_at DESC
        LIMIT ?`,
      )
      .all(userId, NOTIFICATION_LIMIT) as NotificationRow[];

  const unreadCommentIdsByPostId = new Map<string, string[]>();

  rows.forEach((row) => {
    if (row.read_at || !row.post_id || !row.comment_id) {
      return;
    }

    const commentIds = unreadCommentIdsByPostId.get(row.post_id) ?? [];
    commentIds.push(row.comment_id);
    unreadCommentIdsByPostId.set(row.post_id, commentIds);
  });

  return rows.map((row) => {
    const href = row.post_id
      ? buildPostHref(
          row.post_id,
          row.comment_id
            ? unreadCommentIdsByPostId.get(row.post_id) ?? [row.comment_id]
            : [],
        )
      : row.href;

    return mapNotification(row, href);
  });
}

export async function countUnreadNotifications(userId: string) {
  if (isPostgresAuthEnabled()) {
    const row = await queryPgOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM user_notifications
       WHERE recipient_user_id = $1
         AND read_at IS NULL`,
      [userId],
    );

    return Number.parseInt(row?.count ?? "0", 10) || 0;
  }

  const row = getDatabase()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM user_notifications
       WHERE recipient_user_id = ?
         AND read_at IS NULL`,
    )
    .get(userId) as { count: number } | undefined;

  return row?.count ?? 0;
}

export async function markAllNotificationsRead(userId: string) {
  const readAt = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE user_notifications
       SET read_at = $2
       WHERE recipient_user_id = $1
         AND read_at IS NULL`,
      [userId, readAt],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE user_notifications
       SET read_at = ?
       WHERE recipient_user_id = ?
         AND read_at IS NULL`,
    )
    .run(readAt, userId);
}
