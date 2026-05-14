#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vnutri/app}"
APP_ENV_FILE="${APP_ENV_FILE:-/etc/vnutri/app.env}"
BRANCH="${BRANCH:-develop}"
PROCESS_NAME="${PROCESS_NAME:-vnutri}"
RUN_SCRIPT="${RUN_SCRIPT:-/opt/vnutri/run.sh}"
REQUIRED_MIGRATION="${REQUIRED_MIGRATION:-0015_specialist_contact_links}"

log() {
  printf '[deploy-production-vm] %s\n' "$*"
}

die() {
  printf '[deploy-production-vm] ERROR: %s\n' "$*" >&2
  exit 1
}

source_env() {
  [[ -f "$APP_ENV_FILE" ]] || die "Missing env file: $APP_ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$APP_ENV_FILE"
  set +a
  [[ -n "${AUTH_DATABASE_URL:-}" ]] || die "AUTH_DATABASE_URL is required."
}

check_migration() {
  node <<'NODE'
const pg = require("pg");
const required = process.env.REQUIRED_MIGRATION || "0015_specialist_contact_links";
const connectionString = process.env.AUTH_DATABASE_URL;
if (!connectionString) {
  console.error("AUTH_DATABASE_URL is required.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString, max: 1 });
(async () => {
  try {
    const result = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1",
      [required],
    );
    if (!result.rowCount) {
      console.error(`Missing migration ${required}.`);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
NODE
}

source_env
export REQUIRED_MIGRATION

cd "$APP_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "Working tree is dirty. Commit/stash changes before deploy."
fi

log "Fetching origin"
git fetch origin
git reset --hard "origin/${BRANCH}"

log "Installing dependencies"
corepack enable
yarn install --immutable

log "Building Next.js app"
AUTH_DATABASE_PATH=/tmp/vnutri-build-auth.db yarn build
rm -f /tmp/vnutri-build-auth.db

log "Running PostgreSQL migrations"
yarn migrate:auth:postgres:schema

log "Checking migration ${REQUIRED_MIGRATION}"
check_migration

log "Installing PM2 wrapper"
cp "${APP_DIR}/infra/vm/run.sh" "$RUN_SCRIPT"
chmod 0755 "$RUN_SCRIPT"

if pm2 describe "$PROCESS_NAME" >/dev/null 2>&1; then
  log "Reloading PM2 process ${PROCESS_NAME}"
  pm2 reload "$PROCESS_NAME" --update-env
else
  log "Starting PM2 process ${PROCESS_NAME}"
  pm2 start "$RUN_SCRIPT" --name "$PROCESS_NAME"
fi

log "Running final healthcheck"
"${APP_DIR}/scripts/server/healthcheck.sh"

log "Deploy completed"
