#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vnutri/app}"
APP_ENV_FILE="${APP_ENV_FILE:-/etc/vnutri/app.env}"

cd "$APP_DIR"

if [[ ! -f "$APP_ENV_FILE" ]]; then
  printf '[run] Missing env file: %s\n' "$APP_ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$APP_ENV_FILE"
set +a

export GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse --short HEAD)}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export PORT="${PORT:-3000}"

exec yarn next start -H "$HOSTNAME" -p "$PORT"
