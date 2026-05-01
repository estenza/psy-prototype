import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

function openDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "vnutri-domain-"));
  const database = new DatabaseSync(join(directory, "app.db"));

  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      is_banned INTEGER NOT NULL DEFAULT 0 CHECK (is_banned IN (0, 1))
    );

    CREATE TABLE posts (
      id TEXT PRIMARY KEY,
      author_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      comments_count INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE post_reactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TEXT NOT NULL,
      UNIQUE (post_id, user_id, reaction_type)
    );

    CREATE TABLE post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      author_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      parent_comment_id TEXT REFERENCES post_comments (id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'deleted')),
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE post_comment_reactions (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES post_comments (id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TEXT NOT NULL,
      UNIQUE (comment_id, user_id, reaction_type)
    );

    CREATE TABLE user_followed_authors (
      follower_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      followed_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_user_id, followed_user_id),
      CHECK (follower_user_id <> followed_user_id)
    );

    CREATE TABLE user_notification_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
      post_replies_enabled INTEGER NOT NULL DEFAULT 1 CHECK (post_replies_enabled IN (0, 1)),
      direct_replies_enabled INTEGER NOT NULL DEFAULT 1 CHECK (direct_replies_enabled IN (0, 1)),
      followed_post_replies_enabled INTEGER NOT NULL DEFAULT 1 CHECK (followed_post_replies_enabled IN (0, 1)),
      followed_author_posts_enabled INTEGER NOT NULL DEFAULT 1 CHECK (followed_author_posts_enabled IN (0, 1)),
      system_messages_enabled INTEGER NOT NULL DEFAULT 1 CHECK (system_messages_enabled IN (0, 1)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE user_notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      actor_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (
        type IN ('post_reply', 'direct_reply', 'followed_post_reply', 'followed_author_post', 'system')
      ),
      post_id TEXT REFERENCES posts (id) ON DELETE CASCADE,
      comment_id TEXT REFERENCES post_comments (id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      href TEXT NOT NULL DEFAULT '',
      dedupe_key TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (recipient_user_id, dedupe_key)
    );

    CREATE TABLE notification_outbox (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('post.published', 'comment.created', 'author.followed')
      ),
      aggregate_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return {
    close() {
      database.close();
      rmSync(directory, { force: true, recursive: true });
    },
    database,
  };
}

function now() {
  return new Date().toISOString();
}

function insertUser(database, id, input = {}) {
  database
    .prepare("INSERT INTO users (id, display_name, is_banned) VALUES (?, ?, ?)")
    .run(id, input.displayName ?? id, input.isBanned ? 1 : 0);
}

function insertPost(database, id, authorUserId) {
  database
    .prepare("INSERT INTO posts (id, author_user_id, title, created_at) VALUES (?, ?, ?, ?)")
    .run(id, authorUserId, `Post ${id}`, now());
}

function readCount(database, sql, ...values) {
  return database.prepare(sql).get(...values).count;
}

function likePost(database, postId, userId, liked) {
  database.exec("BEGIN IMMEDIATE;");
  try {
    if (liked) {
      database
        .prepare(
          `INSERT OR IGNORE INTO post_reactions (id, post_id, user_id, reaction_type, created_at)
           VALUES (?, ?, ?, 'like', ?)`,
        )
        .run(randomUUID(), postId, userId, now());
    } else {
      database
        .prepare("DELETE FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = 'like'")
        .run(postId, userId);
    }

    database
      .prepare(
        `UPDATE posts
         SET likes_count = (
           SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction_type = 'like'
         )
         WHERE id = ?`,
      )
      .run(postId, postId);
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function addComment(database, commentId, postId, authorUserId) {
  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare(
        `INSERT INTO post_comments (id, post_id, author_user_id, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(commentId, postId, authorUserId, now());

    database
      .prepare(
        `UPDATE posts
         SET comments_count = (
           SELECT COUNT(*) FROM post_comments WHERE post_id = ? AND status = 'published'
         )
         WHERE id = ?`,
      )
      .run(postId, postId);

    database
      .prepare(
        `INSERT INTO notification_outbox (id, event_type, aggregate_id, payload_json, available_at, created_at)
         VALUES (?, 'comment.created', ?, ?, ?, ?)`,
      )
      .run(randomUUID(), commentId, JSON.stringify({ commentId, postId }), now(), now());
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function followAuthor(database, followerUserId, followedUserId) {
  if (followerUserId === followedUserId) {
    throw new Error("Нельзя подписаться на свой профиль.");
  }

  const follower = database.prepare("SELECT is_banned FROM users WHERE id = ?").get(followerUserId);

  if (follower?.is_banned) {
    throw new Error("Заблокированный аккаунт не может оформлять подписки.");
  }

  database.exec("BEGIN IMMEDIATE;");
  try {
    const result = database
      .prepare(
        `INSERT OR IGNORE INTO user_followed_authors (follower_user_id, followed_user_id, created_at)
         VALUES (?, ?, ?)`,
      )
      .run(followerUserId, followedUserId, now());

    if (result.changes > 0) {
      database
        .prepare(
          `INSERT INTO notification_outbox (id, event_type, aggregate_id, payload_json, available_at, created_at)
           VALUES (?, 'author.followed', ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          `${followerUserId}:${followedUserId}`,
          JSON.stringify({
            actor: {
              id: followerUserId,
              displayName: followerUserId,
              nickname: followerUserId,
            },
            followedUserId,
          }),
          now(),
          now(),
        );
    }
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function processOutboxAsWorker(database, limit = 20) {
  const rows = database
    .prepare(
      `SELECT id, event_type, payload_json, attempts
       FROM notification_outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(limit);

  for (const row of rows) {
    database.exec("BEGIN IMMEDIATE;");

    try {
      database
        .prepare("UPDATE notification_outbox SET status = 'processing', attempts = attempts + 1 WHERE id = ?")
        .run(row.id);

      const payload = JSON.parse(row.payload_json);

      if (row.event_type === "author.followed") {
        const preferences = database
          .prepare(
            `SELECT system_messages_enabled
             FROM user_notification_preferences
             WHERE user_id = ?
             LIMIT 1`,
          )
          .get(payload.followedUserId);

        if ((preferences?.system_messages_enabled ?? 1) !== 0) {
          database
            .prepare(
              `INSERT OR IGNORE INTO user_notifications (
                id,
                recipient_user_id,
                actor_user_id,
                type,
                title,
                href,
                dedupe_key,
                created_at
              )
              VALUES (?, ?, ?, 'system', ?, ?, ?, ?)`,
            )
            .run(
              randomUUID(),
              payload.followedUserId,
              payload.actor.id,
              `@${payload.actor.nickname} подписался на вас`,
              `/${payload.actor.nickname}`,
              `author-followed:${payload.actor.id}`,
              now(),
            );
        }
      }

      database
        .prepare("UPDATE notification_outbox SET status = 'processed' WHERE id = ?")
        .run(row.id);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  return rows.length;
}

test("post like counter stays in sync and is idempotent", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "viewer");
    insertPost(database, "post-1", "author");

    likePost(database, "post-1", "viewer", true);
    likePost(database, "post-1", "viewer", true);
    assert.equal(readCount(database, "SELECT likes_count AS count FROM posts WHERE id = ?", "post-1"), 1);

    likePost(database, "post-1", "viewer", false);
    assert.equal(readCount(database, "SELECT likes_count AS count FROM posts WHERE id = ?", "post-1"), 0);
  } finally {
    close();
  }
});

test("comment creation updates counters and enqueues notification event atomically", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "commenter");
    insertPost(database, "post-1", "author");

    addComment(database, "comment-1", "post-1", "commenter");

    assert.equal(readCount(database, "SELECT comments_count AS count FROM posts WHERE id = ?", "post-1"), 1);
    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM notification_outbox WHERE event_type = 'comment.created'"),
      1,
    );
  } finally {
    close();
  }
});

test("following authors is idempotent, forbids invalid access, and emits author.followed once", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "viewer");
    insertUser(database, "banned", { isBanned: true });

    followAuthor(database, "viewer", "author");
    followAuthor(database, "viewer", "author");

    assert.equal(readCount(database, "SELECT COUNT(*) AS count FROM user_followed_authors"), 1);
    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM notification_outbox WHERE event_type = 'author.followed'"),
      1,
    );
    assert.throws(() => followAuthor(database, "viewer", "viewer"));
    assert.throws(() => followAuthor(database, "banned", "author"));
  } finally {
    close();
  }
});

test("domain event worker turns author.followed into a deduped notification", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "viewer");

    followAuthor(database, "viewer", "author");
    followAuthor(database, "viewer", "author");

    assert.equal(processOutboxAsWorker(database), 1);
    assert.equal(
      readCount(
        database,
        "SELECT COUNT(*) AS count FROM user_notifications WHERE recipient_user_id = ? AND type = 'system'",
        "author",
      ),
      1,
    );
    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM notification_outbox WHERE status = 'processed'"),
      1,
    );

    processOutboxAsWorker(database);
    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM user_notifications WHERE recipient_user_id = ?", "author"),
      1,
    );
  } finally {
    close();
  }
});

test("author.followed notifications respect system message preferences", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "viewer");
    database
      .prepare(
        `INSERT INTO user_notification_preferences (
          user_id,
          system_messages_enabled,
          updated_at
        )
        VALUES (?, 0, ?)`,
      )
      .run("author", now());

    followAuthor(database, "viewer", "author");

    assert.equal(processOutboxAsWorker(database), 1);
    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM user_notifications WHERE recipient_user_id = ?", "author"),
      0,
    );
    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM notification_outbox WHERE status = 'processed'"),
      1,
    );
  } finally {
    close();
  }
});

test("notifications are deduplicated and unread count changes after read", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "viewer");
    insertPost(database, "post-1", "author");
    addComment(database, "comment-1", "post-1", "viewer");

    const insertNotification = database.prepare(
      `INSERT OR IGNORE INTO user_notifications (
        id,
        recipient_user_id,
        actor_user_id,
        type,
        post_id,
        comment_id,
        title,
        dedupe_key,
        created_at
      )
      VALUES (?, 'author', 'viewer', 'post_reply', 'post-1', 'comment-1', 'Reply', 'post-reply:comment-1', ?)`,
    );

    insertNotification.run(randomUUID(), now());
    insertNotification.run(randomUUID(), now());

    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM user_notifications WHERE read_at IS NULL"),
      1,
    );

    database
      .prepare("UPDATE user_notifications SET read_at = ? WHERE recipient_user_id = ? AND read_at IS NULL")
      .run(now(), "author");

    assert.equal(
      readCount(database, "SELECT COUNT(*) AS count FROM user_notifications WHERE read_at IS NULL"),
      0,
    );
  } finally {
    close();
  }
});

test("deleting a post cascades comments, reactions, follows and notifications", () => {
  const { database, close } = openDatabase();
  try {
    insertUser(database, "author");
    insertUser(database, "viewer");
    insertPost(database, "post-1", "author");
    likePost(database, "post-1", "viewer", true);
    addComment(database, "comment-1", "post-1", "viewer");
    database
      .prepare(
        `INSERT INTO user_notifications (
          id,
          recipient_user_id,
          actor_user_id,
          type,
          post_id,
          comment_id,
          title,
          dedupe_key,
          created_at
        )
        VALUES (?, 'author', 'viewer', 'post_reply', 'post-1', 'comment-1', 'Reply', 'reply:1', ?)`,
      )
      .run(randomUUID(), now());

    database.prepare("DELETE FROM posts WHERE id = ?").run("post-1");

    assert.equal(readCount(database, "SELECT COUNT(*) AS count FROM posts"), 0);
    assert.equal(readCount(database, "SELECT COUNT(*) AS count FROM post_comments"), 0);
    assert.equal(readCount(database, "SELECT COUNT(*) AS count FROM post_reactions"), 0);
    assert.equal(readCount(database, "SELECT COUNT(*) AS count FROM user_notifications"), 0);
  } finally {
    close();
  }
});
