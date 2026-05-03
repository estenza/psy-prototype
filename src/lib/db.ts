import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getAppEnvironment } from "@/lib/app-env";

const DATABASE_PATH =
  process.env.AUTH_DATABASE_PATH?.trim() || join(process.cwd(), "data", "app.db");

type GlobalDatabaseCache = typeof globalThis & {
  __psyPrototypeDatabase?: DatabaseSync;
};

function readTableColumns(database: DatabaseSync, tableName: string) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{
    name: string;
  }>;
}

function readForeignKeys(database: DatabaseSync, tableName: string) {
  return database
    .prepare(`PRAGMA foreign_key_list(${tableName})`)
    .all() as Array<{
    table: string;
  }>;
}

function tableExists(database: DatabaseSync, tableName: string) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(tableName);

  return Boolean(row);
}

function renameTableIfNeeded(database: DatabaseSync, oldName: string, newName: string) {
  if (!tableExists(database, oldName) || tableExists(database, newName)) {
    return;
  }

  database.exec(`ALTER TABLE ${oldName} RENAME TO ${newName};`);
}

function renameColumnIfNeeded(
  database: DatabaseSync,
  tableName: string,
  oldName: string,
  newName: string,
) {
  if (!tableExists(database, tableName)) {
    return;
  }

  const columns = new Set(readTableColumns(database, tableName).map((column) => column.name));

  if (!columns.has(oldName) || columns.has(newName)) {
    return;
  }

  database.exec(`ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName};`);
}

function migrateLegacyPostTables(database: DatabaseSync) {
  database.exec("PRAGMA foreign_keys = OFF;");
  renameTableIfNeeded(database, "discussions", "posts");
  renameTableIfNeeded(database, "discussion_reactions", "post_reactions");
  renameTableIfNeeded(database, "discussion_comments", "post_comments");
  renameTableIfNeeded(database, "discussion_comment_reactions", "post_comment_reactions");
  renameTableIfNeeded(database, "discussion_comment_reports", "post_comment_reports");
  renameColumnIfNeeded(database, "post_reactions", "discussion_id", "post_id");
  renameColumnIfNeeded(database, "post_comments", "discussion_id", "post_id");
  database.exec("PRAGMA foreign_keys = ON;");
}

function createUsersTable(database: DatabaseSync) {
  database.exec(`
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
      profile_cover_url TEXT,
      profile_description TEXT,
      specialties_json TEXT NOT NULL DEFAULT '[]',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'specialist')),
      specialist_status TEXT NOT NULL DEFAULT 'none' CHECK (
        specialist_status IN ('none', 'pending', 'verified', 'rejected', 'suspended')
      ),
      is_moderator INTEGER NOT NULL DEFAULT 0 CHECK (is_moderator IN (0, 1)),
      is_banned INTEGER NOT NULL DEFAULT 0 CHECK (is_banned IN (0, 1)),
      ban_reason TEXT,
      onboarding_step TEXT NOT NULL DEFAULT 'role' CHECK (
        onboarding_step IN ('role', 'user-profile', 'specialist-profile', 'complete')
      ),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function ensureUsersTableColumns(database: DatabaseSync) {
  const columns = new Set(readTableColumns(database, "users").map((column) => column.name));

  if (!columns.has("avatar_source_url")) {
    database.exec("ALTER TABLE users ADD COLUMN avatar_source_url TEXT;");
  }

  if (!columns.has("avatar_card_url")) {
    database.exec("ALTER TABLE users ADD COLUMN avatar_card_url TEXT;");
  }

  if (!columns.has("profile_description")) {
    database.exec("ALTER TABLE users ADD COLUMN profile_description TEXT;");
  }

  if (!columns.has("profile_cover_url")) {
    database.exec("ALTER TABLE users ADD COLUMN profile_cover_url TEXT;");
  }

  if (!columns.has("specialties_json")) {
    database.exec("ALTER TABLE users ADD COLUMN specialties_json TEXT NOT NULL DEFAULT '[]';");
  }

  if (!columns.has("is_banned")) {
    database.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0;");
  }

  if (!columns.has("ban_reason")) {
    database.exec("ALTER TABLE users ADD COLUMN ban_reason TEXT;");
  }
}

function createPostsTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_user_id TEXT NOT NULL,
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
      views_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS posts_created_at_idx
      ON posts (created_at DESC);
    CREATE INDEX IF NOT EXISTS posts_author_user_id_idx
      ON posts (author_user_id);

    CREATE TABLE IF NOT EXISTS post_reactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (post_id, user_id, reaction_type)
    );

    CREATE INDEX IF NOT EXISTS post_reactions_post_id_idx
      ON post_reactions (post_id);
    CREATE INDEX IF NOT EXISTS post_reactions_user_id_idx
      ON post_reactions (user_id);

    CREATE TABLE IF NOT EXISTS user_profile_favorite_posts (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS user_profile_favorite_posts_user_id_idx
      ON user_profile_favorite_posts (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_profile_favorite_posts_post_id_idx
      ON user_profile_favorite_posts (post_id);
  `);
}

function ensurePostsTableColumns(database: DatabaseSync) {
  const columns = new Set(readTableColumns(database, "posts").map((column) => column.name));

  if (!columns.has("views_count")) {
    database.exec("ALTER TABLE posts ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0;");
  }
}

function createUserIgnoredAuthorsTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_ignored_authors (
      user_id TEXT NOT NULL,
      ignored_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, ignored_user_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (ignored_user_id) REFERENCES users (id) ON DELETE CASCADE,
      CHECK (user_id <> ignored_user_id)
    );

    CREATE INDEX IF NOT EXISTS user_ignored_authors_user_id_idx
      ON user_ignored_authors (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_ignored_authors_ignored_user_id_idx
      ON user_ignored_authors (ignored_user_id);
  `);
}

function createUserBookmarksTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_bookmarked_posts (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS user_bookmarked_posts_user_id_idx
      ON user_bookmarked_posts (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_bookmarked_posts_post_id_idx
      ON user_bookmarked_posts (post_id);
  `);
}

function createUserFollowsTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_followed_posts (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS user_followed_posts_user_id_idx
      ON user_followed_posts (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_followed_posts_post_id_idx
      ON user_followed_posts (post_id);

    CREATE TABLE IF NOT EXISTS user_followed_authors (
      follower_user_id TEXT NOT NULL,
      followed_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_user_id, followed_user_id),
      FOREIGN KEY (follower_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (followed_user_id) REFERENCES users (id) ON DELETE CASCADE,
      CHECK (follower_user_id <> followed_user_id)
    );

    CREATE INDEX IF NOT EXISTS user_followed_authors_follower_user_id_idx
      ON user_followed_authors (follower_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_followed_authors_followed_user_id_idx
      ON user_followed_authors (followed_user_id);
  `);
}

function createNotificationsTables(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_notification_preferences (
      user_id TEXT PRIMARY KEY,
      post_replies_enabled INTEGER NOT NULL DEFAULT 1 CHECK (post_replies_enabled IN (0, 1)),
      direct_replies_enabled INTEGER NOT NULL DEFAULT 1 CHECK (direct_replies_enabled IN (0, 1)),
      followed_post_replies_enabled INTEGER NOT NULL DEFAULT 1 CHECK (followed_post_replies_enabled IN (0, 1)),
      followed_author_posts_enabled INTEGER NOT NULL DEFAULT 1 CHECK (followed_author_posts_enabled IN (0, 1)),
      system_messages_enabled INTEGER NOT NULL DEFAULT 1 CHECK (system_messages_enabled IN (0, 1)),
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL,
      actor_user_id TEXT,
      type TEXT NOT NULL CHECK (
        type IN (
          'post_reply',
          'direct_reply',
          'followed_post_reply',
          'followed_author_post',
          'system'
        )
      ),
      post_id TEXT,
      comment_id TEXT,
      title TEXT NOT NULL,
      body TEXT,
      href TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recipient_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES post_comments (id) ON DELETE CASCADE,
      UNIQUE (recipient_user_id, dedupe_key)
    );

    CREATE INDEX IF NOT EXISTS user_notifications_recipient_created_at_idx
      ON user_notifications (recipient_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_notifications_recipient_read_at_idx
      ON user_notifications (recipient_user_id, read_at);
  `);
}

function createNotificationOutboxTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('post.published', 'comment.created', 'author.followed')
      ),
      aggregate_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'processed', 'failed')
      ),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      available_at TEXT NOT NULL,
      processing_started_at TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
      ON notification_outbox (status, available_at, created_at);

    CREATE INDEX IF NOT EXISTS notification_outbox_aggregate_idx
      ON notification_outbox (event_type, aggregate_id);
  `);
}

function migrateNotificationPreferenceColumns(database: DatabaseSync) {
  renameColumnIfNeeded(
    database,
    "user_notification_preferences",
    "bookmarked_post_replies_enabled",
    "followed_post_replies_enabled",
  );
}

function migrateNotificationOutboxEventTypes(database: DatabaseSync) {
  if (!tableExists(database, "notification_outbox")) {
    return;
  }

  const row = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notification_outbox' LIMIT 1")
    .get() as { sql?: string } | undefined;
  const tableSql = row?.sql ?? "";

  if (tableSql.includes("'author.followed'")) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    ALTER TABLE notification_outbox RENAME TO notification_outbox_legacy_event_type;
  `);

  createNotificationOutboxTable(database);

  database.exec(`
    INSERT INTO notification_outbox (
      id,
      event_type,
      aggregate_id,
      payload_json,
      status,
      attempts,
      last_error,
      available_at,
      processing_started_at,
      processed_at,
      created_at
    )
    SELECT
      id,
      event_type,
      aggregate_id,
      payload_json,
      status,
      attempts,
      last_error,
      available_at,
      processing_started_at,
      processed_at,
      created_at
    FROM notification_outbox_legacy_event_type;

    DROP TABLE notification_outbox_legacy_event_type;
    PRAGMA foreign_keys = ON;
  `);
}

function migrateLegacyNotificationTypes(database: DatabaseSync) {
  if (!tableExists(database, "user_notifications")) {
    return;
  }

  const row = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user_notifications' LIMIT 1")
    .get() as { sql?: string } | undefined;
  const tableSql = row?.sql ?? "";

  if (!tableSql.includes("'bookmarked_post_reply'") || tableSql.includes("'followed_post_reply'")) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    ALTER TABLE user_notifications RENAME TO user_notifications_legacy_type;
  `);

  createNotificationsTables(database);

  database.exec(`
    INSERT INTO user_notifications (
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
      read_at,
      created_at
    )
    SELECT
      id,
      recipient_user_id,
      actor_user_id,
      CASE
        WHEN type = 'bookmarked_post_reply' THEN 'followed_post_reply'
        ELSE type
      END,
      post_id,
      comment_id,
      title,
      body,
      href,
      dedupe_key,
      read_at,
      created_at
    FROM user_notifications_legacy_type;

    DROP TABLE user_notifications_legacy_type;
    PRAGMA foreign_keys = ON;
  `);
}

function createPostCommentsTables(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_user_id TEXT NOT NULL,
      parent_comment_id TEXT,
      root_comment_id TEXT,
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      edited_at TEXT,
      hidden_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES post_comments (id) ON DELETE CASCADE,
      FOREIGN KEY (root_comment_id) REFERENCES post_comments (id) ON DELETE CASCADE
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
      comment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (comment_id) REFERENCES post_comments (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (comment_id, user_id, reaction_type)
    );

    CREATE INDEX IF NOT EXISTS post_comment_reactions_comment_id_idx
      ON post_comment_reactions (comment_id);
    CREATE INDEX IF NOT EXISTS post_comment_reactions_user_id_idx
      ON post_comment_reactions (user_id);

    CREATE TABLE IF NOT EXISTS post_comment_reports (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      reporter_user_id TEXT NOT NULL,
      reason TEXT,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'reviewed', 'dismissed', 'resolved')
      ),
      resolution_note TEXT,
      resolved_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (comment_id) REFERENCES post_comments (id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
      UNIQUE (comment_id, reporter_user_id)
    );

    CREATE INDEX IF NOT EXISTS post_comment_reports_comment_id_idx
      ON post_comment_reports (comment_id);
    CREATE INDEX IF NOT EXISTS post_comment_reports_status_idx
      ON post_comment_reports (status, created_at DESC);
  `);
}

function createSessionsTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
  `);
}

function createOtpCodesTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS auth_otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('sign-in', 'sign-up')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS auth_otp_codes_email_idx
      ON auth_otp_codes(email, expires_at);
  `);
}

function createPasswordResetTokensTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
      ON password_reset_tokens (user_id);
    CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
      ON password_reset_tokens (expires_at);
  `);
}

function migrateLegacyUsersTable(database: DatabaseSync) {
  const columns = readTableColumns(database, "users");
  const hasModernColumns = columns.some((column) => column.name === "nickname");

  if (columns.length === 0 || hasModernColumns) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    ALTER TABLE users RENAME TO users_legacy_auth;
  `);

  createUsersTable(database);

  database.exec(`
    INSERT INTO users (
      id,
      email,
      password_hash,
      display_name,
      nickname,
      first_name,
      last_name,
      patronymic,
      avatar_url,
      role,
      specialist_status,
      is_moderator,
      onboarding_step,
      created_at,
      updated_at
    )
    SELECT
      id,
      email,
      password_hash,
      display_name,
      CASE
        WHEN role = 'user' AND username IS NOT NULL AND TRIM(username) <> '' THEN username
        ELSE NULL
      END AS nickname,
      NULL AS first_name,
      NULL AS last_name,
      NULL AS patronymic,
      avatar_url,
      CASE
        WHEN role = 'psychologist' THEN 'specialist'
        ELSE 'user'
      END AS role,
      psychologist_status AS specialist_status,
      CASE
        WHEN role = 'moderator' THEN 1
        ELSE 0
      END AS is_moderator,
      'complete' AS onboarding_step,
      created_at,
      updated_at
    FROM users_legacy_auth;

    DROP TABLE users_legacy_auth;
    PRAGMA foreign_keys = ON;
  `);
}

function repairLegacySessionsForeignKey(database: DatabaseSync) {
  const columns = readTableColumns(database, "sessions");

  if (columns.length === 0) {
    return;
  }

  const foreignKeys = readForeignKeys(database, "sessions");
  const referencesLegacyUsers = foreignKeys.some(
    (foreignKey) => foreignKey.table === "users_legacy_auth",
  );

  if (!referencesLegacyUsers) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    ALTER TABLE sessions RENAME TO sessions_legacy_fk;
  `);

  createSessionsTable(database);

  database.exec(`
    INSERT INTO sessions (
      id,
      user_id,
      token_hash,
      expires_at,
      created_at
    )
    SELECT
      id,
      user_id,
      token_hash,
      expires_at,
      created_at
    FROM sessions_legacy_fk;

    DROP TABLE sessions_legacy_fk;
    PRAGMA foreign_keys = ON;
  `);
}

function initializeDatabase(database: DatabaseSync) {
  database.exec("PRAGMA foreign_keys = ON;");
  createUsersTable(database);
  migrateLegacyUsersTable(database);
  createUsersTable(database);
  ensureUsersTableColumns(database);
  migrateLegacyPostTables(database);
  createPostsTable(database);
  ensurePostsTableColumns(database);
  createUserIgnoredAuthorsTable(database);
  createUserBookmarksTable(database);
  createUserFollowsTable(database);
  createPostCommentsTables(database);
  migrateLegacyNotificationTypes(database);
  createNotificationsTables(database);
  migrateNotificationPreferenceColumns(database);
  createNotificationOutboxTable(database);
  migrateNotificationOutboxEventTypes(database);
  createSessionsTable(database);
  createPasswordResetTokensTable(database);
  createOtpCodesTable(database);
  repairLegacySessionsForeignKey(database);
}

function assertSafeDeployedDatabaseConfig() {
  const appEnvironment = getAppEnvironment();
  const authDatabaseUrl = process.env.AUTH_DATABASE_URL?.trim() || "";

  if ((appEnvironment === "production" || appEnvironment === "staging") && !authDatabaseUrl) {
    throw new Error(
      "Staging and production auth storage require AUTH_DATABASE_URL. Refusing to fall back to SQLite in the container filesystem.",
    );
  }
}

export function getDatabase() {
  const globalCache = globalThis as GlobalDatabaseCache;

  if (globalCache.__psyPrototypeDatabase) {
    initializeDatabase(globalCache.__psyPrototypeDatabase);
    return globalCache.__psyPrototypeDatabase;
  }

  assertSafeDeployedDatabaseConfig();

  mkdirSync(dirname(DATABASE_PATH), {
    recursive: true,
  });

  const database = new DatabaseSync(DATABASE_PATH);
  initializeDatabase(database);
  globalCache.__psyPrototypeDatabase = database;

  return database;
}

export function runDatabaseTransaction<T>(
  callback: (database: DatabaseSync) => T,
) {
  const database = getDatabase();

  database.exec("BEGIN IMMEDIATE;");

  try {
    const result = callback(database);
    database.exec("COMMIT;");
    return result;
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}
