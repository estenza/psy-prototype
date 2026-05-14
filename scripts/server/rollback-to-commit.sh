#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vnutri/app}"
APP_ENV_FILE="${APP_ENV_FILE:-/etc/vnutri/app.env}"
PROCESS_NAME="${PROCESS_NAME:-vnutri}"
TARGET_SHA="${1:-}"

log() {
  printf '[rollback-to-commit] %s\n' "$*"
}

die() {
  printf '[rollback-to-commit] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$TARGET_SHA" ]] || die "Usage: scripts/server/rollback-to-commit.sh <commit-sha>"
[[ -f "$APP_ENV_FILE" ]] || die "Missing env file: $APP_ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$APP_ENV_FILE"
set +a

cd "$APP_DIR"

log "Fetching origin"
git fetch origin

if ! git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
  die "Commit does not exist locally after fetch: ${TARGET_SHA}"
fi

log "Resetting code to ${TARGET_SHA}"
git reset --hard "$TARGET_SHA"

log "Installing dependencies"
corepack enable
yarn install --immutable

log "Building"
AUTH_DATABASE_PATH=/tmp/vnutri-build-auth.db yarn build
rm -f /tmp/vnutri-build-auth.db

log "Reloading PM2 without DB rollback"
pm2 reload "$PROCESS_NAME" --update-env

log "Running healthcheck"
"${APP_DIR}/scripts/server/healthcheck.sh"

log "Rollback completed"
