import "server-only";

import { readFileSync } from "node:fs";
import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

type GlobalPostgresCache = typeof globalThis & {
  __psyPrototypeAuthPostgresPool?: Pool;
  __psyPrototypeAuthPostgresSchemaPromise?: Promise<void>;
};

export type AuthPostgresTransaction = {
  query<T extends QueryResultRow>(
    query: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
};

function getSslConfig(): PoolConfig["ssl"] {
  const sslMode = process.env.AUTH_DATABASE_SSL?.trim()?.toLowerCase();

  if (sslMode === "false" || sslMode === "disable") {
    return undefined;
  }

  const caPath = process.env.AUTH_DATABASE_CA_PATH?.trim();
  const caContent = process.env.AUTH_DATABASE_CA_CERT?.trim();
  const rejectUnauthorized =
    process.env.AUTH_DATABASE_SSL_REJECT_UNAUTHORIZED?.trim() !== "false";

  if (!sslMode && !caPath && !caContent) {
    return undefined;
  }

  return {
    ca: caContent || (caPath ? readFileSync(caPath, "utf8") : undefined),
    rejectUnauthorized,
  };
}

export function getAuthDatabaseUrl() {
  return process.env.AUTH_DATABASE_URL?.trim() || "";
}

export function isPostgresAuthEnabled() {
  return Boolean(getAuthDatabaseUrl());
}

function readGlobalPostgresCache() {
  return globalThis as GlobalPostgresCache;
}

function isRetryableConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("connection terminated unexpectedly")
    || message.includes("server closed the connection unexpectedly")
    || message.includes("connection ended unexpectedly")
    || message.includes("terminating connection due to administrator command")
    || message.includes("client has encountered a connection error")
  );
}

function buildPoolConfig(): PoolConfig {
  const connectionString = getAuthDatabaseUrl();

  if (!connectionString) {
    throw new Error("AUTH_DATABASE_URL is required when PostgreSQL auth storage is enabled.");
  }

  return {
    connectionString,
    max: Number.parseInt(process.env.AUTH_DATABASE_POOL_MAX?.trim() || "", 10) || 4,
    ssl: getSslConfig(),
  };
}

const LATEST_AUTH_POSTGRES_MIGRATION = "0005_notifications_followed_post_naming_and_author_followed";

function buildMissingMigrationMessage() {
  return [
    "PostgreSQL schema is not migrated.",
    'Run "npm run migrate:auth:postgres:schema" before starting the app.',
    `Required migration: ${LATEST_AUTH_POSTGRES_MIGRATION}.`,
  ].join(" ");
}

async function closePool(pool: Pool) {
  pool.removeAllListeners("error");

  try {
    await pool.end();
  } catch (error) {
    console.error("[auth-postgres/pool-end]", error);
  }
}

export async function resetAuthPostgresPool(poolToClose?: Pool) {
  const globalCache = readGlobalPostgresCache();
  const activePool = poolToClose ?? globalCache.__psyPrototypeAuthPostgresPool;

  globalCache.__psyPrototypeAuthPostgresPool = undefined;
  globalCache.__psyPrototypeAuthPostgresSchemaPromise = undefined;

  if (!activePool) {
    return;
  }

  await closePool(activePool);
}

export function getAuthPostgresPool() {
  const globalCache = readGlobalPostgresCache();

  if (globalCache.__psyPrototypeAuthPostgresPool) {
    return globalCache.__psyPrototypeAuthPostgresPool;
  }

  const pool = new Pool(buildPoolConfig());

  pool.on("error", (error) => {
    console.error("[auth-postgres/pool]", error);
    void resetAuthPostgresPool(pool);
  });

  globalCache.__psyPrototypeAuthPostgresPool = pool;

  return pool;
}

async function runAuthPostgresQuery<T extends QueryResultRow>(
  query: string,
  values: unknown[] = [],
  options?: {
    skipSchema?: boolean;
  },
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const pool = getAuthPostgresPool();

    try {
      if (!options?.skipSchema) {
        await ensureAuthPostgresSchema();
      }

      return await pool.query<T>(query, values);
    } catch (error) {
      if (attempt === 0 && isRetryableConnectionError(error)) {
        console.error("[auth-postgres/retry]", error);
        await resetAuthPostgresPool(pool);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Auth PostgreSQL query retry loop exhausted.");
}

async function verifyPostgresMigrations() {
  const result = await runAuthPostgresQuery(
    "SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1",
    [LATEST_AUTH_POSTGRES_MIGRATION],
    {
      skipSchema: true,
    },
  ).catch((error) => {
    if (error?.code === "42P01") {
      throw new Error(buildMissingMigrationMessage(), {
        cause: error,
      });
    }

    throw error;
  });

  if (!result.rowCount) {
    throw new Error(buildMissingMigrationMessage());
  }
}

async function initializePostgresSchema() {
  if (process.env.AUTH_DATABASE_ALLOW_RUNTIME_SCHEMA_SYNC?.trim() !== "true") {
    await verifyPostgresMigrations();
    return;
  }

  await runAuthPostgresQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      nickname TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      patronymic TEXT,
      avatar_url TEXT,
      avatar_source_url TEXT,
      avatar_card_url TEXT,
      profile_description TEXT,
      specialties_json TEXT NOT NULL DEFAULT '[]',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'specialist')),
      specialist_status TEXT NOT NULL DEFAULT 'none' CHECK (
        specialist_status IN ('none', 'pending', 'verified', 'rejected', 'suspended')
      ),
      is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
      is_banned BOOLEAN NOT NULL DEFAULT FALSE,
      ban_reason TEXT,
      onboarding_step TEXT NOT NULL DEFAULT 'role' CHECK (
        onboarding_step IN ('role', 'user-profile', 'specialist-profile', 'complete')
      ),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
      ON password_reset_tokens (user_id);
    CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
      ON password_reset_tokens (expires_at);

    DO $$
    BEGIN
      IF to_regclass('posts') IS NULL AND to_regclass('discussions') IS NOT NULL THEN
        ALTER TABLE discussions RENAME TO posts;
      END IF;
      IF to_regclass('post_reactions') IS NULL AND to_regclass('discussion_reactions') IS NOT NULL THEN
        ALTER TABLE discussion_reactions RENAME TO post_reactions;
      END IF;
      IF to_regclass('post_comments') IS NULL AND to_regclass('discussion_comments') IS NOT NULL THEN
        ALTER TABLE discussion_comments RENAME TO post_comments;
      END IF;
      IF to_regclass('post_comment_reactions') IS NULL AND to_regclass('discussion_comment_reactions') IS NOT NULL THEN
        ALTER TABLE discussion_comment_reactions RENAME TO post_comment_reactions;
      END IF;
      IF to_regclass('post_comment_reports') IS NULL AND to_regclass('discussion_comment_reports') IS NOT NULL THEN
        ALTER TABLE discussion_comment_reports RENAME TO post_comment_reports;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'post_reactions' AND column_name = 'discussion_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'post_reactions' AND column_name = 'post_id'
      ) THEN
        ALTER TABLE post_reactions RENAME COLUMN discussion_id TO post_id;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'post_comments' AND column_name = 'discussion_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'post_comments' AND column_name = 'post_id'
      ) THEN
        ALTER TABLE post_comments RENAME COLUMN discussion_id TO post_id;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      intent TEXT NOT NULL CHECK (intent IN ('support', 'discussion')),
      topic TEXT CHECK (
        topic IS NULL OR topic IN (
          'relationships',
          'emotions',
          'self-esteem',
          'family',
          'work-money',
          'habits-addictions',
          'crisis-loss',
          'self-development',
          'social-situations',
          'hard-states'
        )
      ),
      title TEXT NOT NULL,
      body_html TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image')),
      media_url TEXT,
      media_alt TEXT,
      comments_count INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS posts_created_at_idx
      ON posts (created_at DESC);
    CREATE INDEX IF NOT EXISTS posts_author_user_id_idx
      ON posts (author_user_id);

    CREATE TABLE IF NOT EXISTS post_reactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE (post_id, user_id, reaction_type)
    );

    CREATE INDEX IF NOT EXISTS post_reactions_post_id_idx
      ON post_reactions (post_id);
    CREATE INDEX IF NOT EXISTS post_reactions_user_id_idx
      ON post_reactions (user_id);

    CREATE TABLE IF NOT EXISTS user_profile_favorite_posts (
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, post_id)
    );

    CREATE INDEX IF NOT EXISTS user_profile_favorite_posts_user_id_idx
      ON user_profile_favorite_posts (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_profile_favorite_posts_post_id_idx
      ON user_profile_favorite_posts (post_id);

    CREATE TABLE IF NOT EXISTS user_ignored_authors (
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      ignored_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, ignored_user_id),
      CHECK (user_id <> ignored_user_id)
    );

    CREATE INDEX IF NOT EXISTS user_ignored_authors_user_id_idx
      ON user_ignored_authors (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_ignored_authors_ignored_user_id_idx
      ON user_ignored_authors (ignored_user_id);

    CREATE TABLE IF NOT EXISTS user_bookmarked_posts (
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, post_id)
    );

    CREATE INDEX IF NOT EXISTS user_bookmarked_posts_user_id_idx
      ON user_bookmarked_posts (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_bookmarked_posts_post_id_idx
      ON user_bookmarked_posts (post_id);

    CREATE TABLE IF NOT EXISTS user_followed_posts (
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, post_id)
    );

    CREATE INDEX IF NOT EXISTS user_followed_posts_user_id_idx
      ON user_followed_posts (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_followed_posts_post_id_idx
      ON user_followed_posts (post_id);

    CREATE TABLE IF NOT EXISTS user_followed_authors (
      follower_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      followed_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (follower_user_id, followed_user_id),
      CHECK (follower_user_id <> followed_user_id)
    );

    CREATE INDEX IF NOT EXISTS user_followed_authors_follower_user_id_idx
      ON user_followed_authors (follower_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_followed_authors_followed_user_id_idx
      ON user_followed_authors (followed_user_id);

    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      author_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      parent_comment_id TEXT REFERENCES post_comments (id) ON DELETE CASCADE,
      root_comment_id TEXT REFERENCES post_comments (id) ON DELETE CASCADE,
      depth INTEGER NOT NULL DEFAULT 0 CHECK (depth IN (0, 1)),
      body_html TEXT NOT NULL,
      body_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK (
        status IN ('published', 'hidden', 'deleted', 'pending')
      ),
      hidden_reason TEXT,
      likes_count INTEGER NOT NULL DEFAULT 0,
      replies_count INTEGER NOT NULL DEFAULT 0,
      reports_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      edited_at TIMESTAMPTZ,
      hidden_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS post_comments_post_id_idx
      ON post_comments (post_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS post_comments_parent_comment_id_idx
      ON post_comments (parent_comment_id);
    CREATE INDEX IF NOT EXISTS post_comments_root_comment_id_idx
      ON post_comments (root_comment_id);
    CREATE INDEX IF NOT EXISTS post_comments_status_idx
      ON post_comments (status);

    CREATE TABLE IF NOT EXISTS post_comment_reactions (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES post_comments (id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE (comment_id, user_id, reaction_type)
    );

    CREATE INDEX IF NOT EXISTS post_comment_reactions_comment_id_idx
      ON post_comment_reactions (comment_id);
    CREATE INDEX IF NOT EXISTS post_comment_reactions_user_id_idx
      ON post_comment_reactions (user_id);

    CREATE TABLE IF NOT EXISTS post_comment_reports (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES post_comments (id) ON DELETE CASCADE,
      reporter_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reason TEXT,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'reviewed', 'dismissed', 'resolved')
      ),
      resolution_note TEXT,
      resolved_by_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      resolved_at TIMESTAMPTZ,
      UNIQUE (comment_id, reporter_user_id)
    );

    CREATE INDEX IF NOT EXISTS post_comment_reports_comment_id_idx
      ON post_comment_reports (comment_id);
    CREATE INDEX IF NOT EXISTS post_comment_reports_status_idx
      ON post_comment_reports (status, created_at DESC);

    CREATE TABLE IF NOT EXISTS user_notification_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
      post_replies_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      direct_replies_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      followed_post_replies_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      followed_author_posts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      system_messages_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      actor_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (
        type IN (
          'post_reply',
          'direct_reply',
          'followed_post_reply',
          'followed_author_post',
          'system'
        )
      ),
      post_id TEXT REFERENCES posts (id) ON DELETE CASCADE,
      comment_id TEXT REFERENCES post_comments (id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      href TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE (recipient_user_id, dedupe_key)
    );

    CREATE INDEX IF NOT EXISTS user_notifications_recipient_created_at_idx
      ON user_notifications (recipient_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_notifications_recipient_read_at_idx
      ON user_notifications (recipient_user_id, read_at);

    CREATE TABLE IF NOT EXISTS notification_outbox (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('post.published', 'comment.created', 'author.followed')
      ),
      aggregate_id TEXT NOT NULL,
      payload_json JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'processed', 'failed')
      ),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      available_at TIMESTAMPTZ NOT NULL,
      processing_started_at TIMESTAMPTZ,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
      ON notification_outbox (status, available_at, created_at);

    CREATE INDEX IF NOT EXISTS notification_outbox_aggregate_idx
      ON notification_outbox (event_type, aggregate_id);

    DO $$
    DECLARE
      legacy_notification_type_constraint TEXT;
    BEGIN
      SELECT conname INTO legacy_notification_type_constraint
      FROM pg_constraint
      WHERE conrelid = 'user_notifications'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%bookmarked_post_reply%'
      LIMIT 1;

      IF legacy_notification_type_constraint IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE user_notifications DROP CONSTRAINT %I',
          legacy_notification_type_constraint
        );
        ALTER TABLE user_notifications
          ADD CONSTRAINT user_notifications_type_check CHECK (
            type IN (
              'post_reply',
              'direct_reply',
              'followed_post_reply',
              'followed_author_post',
              'system'
            )
          );
      END IF;

      UPDATE user_notifications
      SET type = 'followed_post_reply'
      WHERE type = 'bookmarked_post_reply';
    END $$;

    CREATE TABLE IF NOT EXISTS auth_otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('sign-in', 'sign-up')),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS auth_otp_codes_email_idx
      ON auth_otp_codes(email, expires_at);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_source_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_card_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_description TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties_json TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
  `, [], {
    skipSchema: true,
  });
}

export async function ensureAuthPostgresSchema() {
  const globalCache = readGlobalPostgresCache();

  if (!globalCache.__psyPrototypeAuthPostgresSchemaPromise) {
    globalCache.__psyPrototypeAuthPostgresSchemaPromise = initializePostgresSchema().catch(
      async (error) => {
        globalCache.__psyPrototypeAuthPostgresSchemaPromise = undefined;

        if (isRetryableConnectionError(error)) {
          await resetAuthPostgresPool();
        }

        throw error;
      },
    );
  }

  await globalCache.__psyPrototypeAuthPostgresSchemaPromise;
}

export async function queryAuthPostgres<T extends QueryResultRow>(
  query: string,
  values: unknown[] = [],
) {
  return await runAuthPostgresQuery<T>(query, values);
}

export async function execAuthPostgres(query: string, values: unknown[] = []) {
  await runAuthPostgresQuery(query, values);
}

export async function runAuthPostgresTransaction<T>(
  callback: (transaction: AuthPostgresTransaction) => Promise<T>,
) {
  await ensureAuthPostgresSchema();

  const pool = getAuthPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback({
      query(query, values = []) {
        return client.query(query, values);
      },
    });

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
