import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
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

export const LATEST_AUTH_POSTGRES_MIGRATION = "0015_specialist_contact_links";
const AUTH_POSTGRES_MIGRATION_LOCK_ID = 825441337;
const AUTH_POSTGRES_MIGRATIONS_DIR = join(process.cwd(), "database", "migrations");

function readAuthPostgresMigrationFiles() {
  return readdirSync(AUTH_POSTGRES_MIGRATIONS_DIR)
    .filter((fileName) => /^\d+_[\w-]+\.sql$/.test(fileName))
    .sort()
    .map((fileName) => ({
      path: join(AUTH_POSTGRES_MIGRATIONS_DIR, fileName),
      version: basename(fileName, ".sql"),
    }));
}

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

async function applyPostgresMigrations() {
  const pool = getAuthPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [AUTH_POSTGRES_MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of readAuthPostgresMigrationFiles()) {
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1",
        [migration.version],
      );

      if (existing.rowCount) {
        continue;
      }

      const sql = await readFile(migration.path, "utf8");

      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [migration.version],
      );
      console.info(`[auth-postgres/migration] applied ${migration.version}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError) => {
      console.error("[auth-postgres/migration-rollback]", rollbackError);
    });
    throw error;
  } finally {
    client.release();
  }
}

async function initializePostgresSchema() {
  await applyPostgresMigrations();
  await verifyPostgresMigrations();
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
