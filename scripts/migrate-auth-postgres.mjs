import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

const { Pool } = pg;
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(rootDir, "database", "migrations");
const databaseUrl = process.env.AUTH_DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("AUTH_DATABASE_URL is required to run Postgres migrations.");
  process.exit(1);
}

function getSslConfig() {
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

function readMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((fileName) => /^\d+_[\w-]+\.sql$/.test(fileName))
    .sort()
    .map((fileName) => join(migrationsDir, fileName));
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  ssl: getSslConfig(),
});

try {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const migrationPath of readMigrationFiles()) {
      const version = basename(migrationPath, ".sql");
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1",
        [version],
      ).catch((error) => {
        if (error?.code === "42P01") {
          return { rowCount: 0 };
        }

        throw error;
      });

      if (existing.rowCount) {
        continue;
      }

      const sql = await readFile(migrationPath, "utf8");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [version],
      );
      console.log(`Applied ${version}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
