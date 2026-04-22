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

function createDiscussionsTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS discussions (
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS discussions_created_at_idx
      ON discussions (created_at DESC);
    CREATE INDEX IF NOT EXISTS discussions_author_user_id_idx
      ON discussions (author_user_id);

    CREATE TABLE IF NOT EXISTS discussion_reactions (
      id TEXT PRIMARY KEY,
      discussion_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (discussion_id) REFERENCES discussions (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (discussion_id, user_id, reaction_type)
    );

    CREATE INDEX IF NOT EXISTS discussion_reactions_discussion_id_idx
      ON discussion_reactions (discussion_id);
    CREATE INDEX IF NOT EXISTS discussion_reactions_user_id_idx
      ON discussion_reactions (user_id);
  `);
}

function createDiscussionCommentsTables(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS discussion_comments (
      id TEXT PRIMARY KEY,
      discussion_id TEXT NOT NULL,
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
      FOREIGN KEY (discussion_id) REFERENCES discussions (id) ON DELETE CASCADE,
      FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES discussion_comments (id) ON DELETE CASCADE,
      FOREIGN KEY (root_comment_id) REFERENCES discussion_comments (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS discussion_comments_discussion_id_idx
      ON discussion_comments (discussion_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS discussion_comments_parent_comment_id_idx
      ON discussion_comments (parent_comment_id);
    CREATE INDEX IF NOT EXISTS discussion_comments_root_comment_id_idx
      ON discussion_comments (root_comment_id);
    CREATE INDEX IF NOT EXISTS discussion_comments_status_idx
      ON discussion_comments (status);

    CREATE TABLE IF NOT EXISTS discussion_comment_reactions (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (comment_id) REFERENCES discussion_comments (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (comment_id, user_id, reaction_type)
    );

    CREATE INDEX IF NOT EXISTS discussion_comment_reactions_comment_id_idx
      ON discussion_comment_reactions (comment_id);
    CREATE INDEX IF NOT EXISTS discussion_comment_reactions_user_id_idx
      ON discussion_comment_reactions (user_id);

    CREATE TABLE IF NOT EXISTS discussion_comment_reports (
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
      FOREIGN KEY (comment_id) REFERENCES discussion_comments (id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
      UNIQUE (comment_id, reporter_user_id)
    );

    CREATE INDEX IF NOT EXISTS discussion_comment_reports_comment_id_idx
      ON discussion_comment_reports (comment_id);
    CREATE INDEX IF NOT EXISTS discussion_comment_reports_status_idx
      ON discussion_comment_reports (status, created_at DESC);
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
  createDiscussionsTable(database);
  createDiscussionCommentsTables(database);
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
