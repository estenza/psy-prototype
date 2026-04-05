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
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'specialist')),
      specialist_status TEXT NOT NULL DEFAULT 'none' CHECK (
        specialist_status IN ('none', 'pending', 'verified', 'rejected', 'suspended')
      ),
      is_moderator INTEGER NOT NULL DEFAULT 0 CHECK (is_moderator IN (0, 1)),
      onboarding_step TEXT NOT NULL DEFAULT 'role' CHECK (
        onboarding_step IN ('role', 'user-profile', 'specialist-profile', 'complete')
      ),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
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

function initializeDatabase(database: DatabaseSync) {
  database.exec("PRAGMA foreign_keys = ON;");
  createUsersTable(database);
  migrateLegacyUsersTable(database);
  createUsersTable(database);
  createDiscussionsTable(database);
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
