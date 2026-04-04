import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const { Pool } = pg;

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

async function ensureSchema(pool) {
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
  `);
}

async function main() {
  const sqlitePath = process.argv[2];
  const connectionString = process.env.AUTH_DATABASE_URL?.trim();

  if (!sqlitePath) {
    console.error("Usage: node scripts/migrate-auth-sqlite-to-postgres.mjs <sqlite-path>");
    process.exit(1);
  }

  if (!connectionString) {
    console.error("AUTH_DATABASE_URL is required.");
    process.exit(1);
  }

  const sqlite = new DatabaseSync(sqlitePath, {
    open: true,
    readOnly: true,
  });
  const pool = new Pool({
    connectionString,
    max: 1,
    ssl: getSslConfig(),
  });

  try {
    await ensureSchema(pool);

    const users = sqlite.prepare("SELECT * FROM users").all();
    const sessions = sqlite.prepare("SELECT * FROM sessions").all();
    const passwordResetTokens = sqlite
      .prepare("SELECT * FROM password_reset_tokens")
      .all();

    await pool.query("BEGIN");

    for (const user of users) {
      await pool.query(
        `
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
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            display_name = EXCLUDED.display_name,
            nickname = EXCLUDED.nickname,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            patronymic = EXCLUDED.patronymic,
            avatar_url = EXCLUDED.avatar_url,
            role = EXCLUDED.role,
            specialist_status = EXCLUDED.specialist_status,
            is_moderator = EXCLUDED.is_moderator,
            onboarding_step = EXCLUDED.onboarding_step,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
        `,
        [
          user.id,
          user.email,
          user.password_hash,
          user.display_name,
          user.nickname,
          user.first_name,
          user.last_name,
          user.patronymic,
          user.avatar_url,
          user.role,
          user.specialist_status,
          Boolean(user.is_moderator),
          user.onboarding_step,
          user.created_at,
          user.updated_at,
        ],
      );
    }

    for (const session of sessions) {
      await pool.query(
        `
          INSERT INTO sessions (
            id,
            user_id,
            token_hash,
            expires_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            token_hash = EXCLUDED.token_hash,
            expires_at = EXCLUDED.expires_at,
            created_at = EXCLUDED.created_at
        `,
        [
          session.id,
          session.user_id,
          session.token_hash,
          session.expires_at,
          session.created_at,
        ],
      );
    }

    for (const token of passwordResetTokens) {
      await pool.query(
        `
          INSERT INTO password_reset_tokens (
            id,
            user_id,
            token_hash,
            expires_at,
            used_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            token_hash = EXCLUDED.token_hash,
            expires_at = EXCLUDED.expires_at,
            used_at = EXCLUDED.used_at,
            created_at = EXCLUDED.created_at
        `,
        [
          token.id,
          token.user_id,
          token.token_hash,
          token.expires_at,
          token.used_at,
          token.created_at,
        ],
      );
    }

    await pool.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          ok: true,
          users: users.length,
          sessions: sessions.length,
          passwordResetTokens: passwordResetTokens.length,
          sqlitePath,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
