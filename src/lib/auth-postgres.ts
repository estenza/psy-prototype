import "server-only";

import { readFileSync } from "node:fs";
import { Pool, type PoolConfig, type QueryResultRow } from "pg";

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

async function initializePostgresSchema() {
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
