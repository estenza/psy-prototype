#!/usr/bin/env bash
set -euo pipefail

PROCESS_NAME="${PROCESS_NAME:-vnutri}"
PORT="${PORT:-3000}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-80}"

log() {
  printf '[healthcheck] %s\n' "$*"
}

die() {
  printf '[healthcheck] ERROR: %s\n' "$*" >&2
  exit 1
}

log "Checking app health endpoint"
curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null

log "Checking PM2 process"
if [[ "$(id -un)" == "vnutri" ]]; then
  pm2 describe "$PROCESS_NAME" >/dev/null
else
  sudo -iu vnutri pm2 describe "$PROCESS_NAME" >/dev/null
fi

log "Checking nginx"
systemctl is-active --quiet nginx || die "nginx is not active"

log "Checking postgresql"
systemctl is-active --quiet postgresql || die "postgresql is not active"

log "Checking disk usage"
usage="$(df -P / | awk 'NR == 2 { gsub("%", "", $5); print $5 }')"
if [[ "$usage" -ge "$DISK_WARN_PERCENT" ]]; then
  die "Root disk usage is ${usage}%"
fi

log "OK"
