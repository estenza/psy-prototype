import "server-only";

import { readFileSync } from "node:fs";
import { Pool, type PoolConfig } from "pg";

type GlobalPostgresCache = typeof globalThis & {
  __psyPrototypeAuthPostgresPool?: Pool;
  __psyPrototypeAuthPostgresSchemaPromise?: Promise<void>;
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

export function getAuthPostgresPool() {
  const globalCache = globalThis as GlobalPostgresCache;

  if (globalCache.__psyPrototypeAuthPostgresPool) {
    return globalCache.__psyPrototypeAuthPostgresPool;
  }

  const pool = new Pool(buildPoolConfig());
  globalCache.__psyPrototypeAuthPostgresPool = pool;

  return pool;
}

async function initializePostgresSchema() {
  const pool = getAuthPostgresPool();

  await pool.query(`
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
      is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
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

    CREATE TABLE IF NOT EXISTS discussions (
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

    CREATE INDEX IF NOT EXISTS discussions_created_at_idx
      ON discussions (created_at DESC);
    CREATE INDEX IF NOT EXISTS discussions_author_user_id_idx
      ON discussions (author_user_id);
  `);
}

export async function ensureAuthPostgresSchema() {
  const globalCache = globalThis as GlobalPostgresCache;

  if (!globalCache.__psyPrototypeAuthPostgresSchemaPromise) {
    globalCache.__psyPrototypeAuthPostgresSchemaPromise = initializePostgresSchema();
  }

  await globalCache.__psyPrototypeAuthPostgresSchemaPromise;
}
