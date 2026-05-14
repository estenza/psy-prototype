import { NextResponse } from "next/server";
import {
  LATEST_AUTH_POSTGRES_MIGRATION,
  isPostgresAuthEnabled,
  queryAuthPostgres,
} from "@/lib/auth-postgres";
import { getAppEnvironment } from "@/lib/app-env";

export const runtime = "nodejs";

type HealthResponse = {
  status: "ok" | "error";
  appEnv: string;
  db: "ok" | "disabled" | "error";
  migration: string;
  commit: string | null;
  timestamp: string;
  error?: string;
};

export async function GET() {
  const timestamp = new Date().toISOString();
  const commit = process.env.GIT_COMMIT?.trim() || null;
  const appEnv = getAppEnvironment();

  if (!isPostgresAuthEnabled()) {
    return NextResponse.json<HealthResponse>(
      {
        status: "error",
        appEnv,
        db: "disabled",
        migration: LATEST_AUTH_POSTGRES_MIGRATION,
        commit,
        timestamp,
        error: "AUTH_DATABASE_URL is not configured.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  try {
    await queryAuthPostgres("SELECT 1");
    const migrationResult = await queryAuthPostgres(
      "SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1",
      [LATEST_AUTH_POSTGRES_MIGRATION],
    );
    if (!migrationResult.rowCount) {
      throw new Error(`Migration ${LATEST_AUTH_POSTGRES_MIGRATION} is not applied.`);
    }

    return NextResponse.json<HealthResponse>(
      {
        status: "ok",
        appEnv,
        db: "ok",
        migration: LATEST_AUTH_POSTGRES_MIGRATION,
        commit,
        timestamp,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json<HealthResponse>(
      {
        status: "error",
        appEnv,
        db: "error",
        migration: LATEST_AUTH_POSTGRES_MIGRATION,
        commit,
        timestamp,
        error: error instanceof Error ? error.message : "Health check failed.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
