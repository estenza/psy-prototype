#!/usr/bin/env bash
set -euo pipefail

APP_ENV_FILE="${APP_ENV_FILE:-/etc/vnutri/app.env}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/etc/vnutri/backup.env}"
LOG_FILE="${LOG_FILE:-/var/log/vnutri/backup-postgres.log}"

log() {
  printf '[backup-postgres] %s\n' "$*" | tee -a "$LOG_FILE"
}

die() {
  printf '[backup-postgres] ERROR: %s\n' "$*" | tee -a "$LOG_FILE" >&2
  exit 1
}

[[ -f "$APP_ENV_FILE" ]] || die "Missing env file: $APP_ENV_FILE"
[[ -f "$BACKUP_ENV_FILE" ]] || die "Missing backup env file: $BACKUP_ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$APP_ENV_FILE"
# shellcheck disable=SC1090
source "$BACKUP_ENV_FILE"
set +a

[[ -n "${AUTH_DATABASE_URL:-}" ]] || die "AUTH_DATABASE_URL is required."
[[ -n "${VNUTRI_BACKUP_BUCKET:-}" ]] || die "VNUTRI_BACKUP_BUCKET is required."
[[ -n "${S3_ENDPOINT_URL:-}" ]] || die "S3_ENDPOINT_URL is required."

LOCAL_DIR="${VNUTRI_BACKUP_LOCAL_DIR:-/var/backups/vnutri/postgres}"
PREFIX="${VNUTRI_BACKUP_PREFIX:-postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="vnutri-${TIMESTAMP}.dump"
TMP_FILE="${LOCAL_DIR}/.${FILENAME}.tmp"
FINAL_FILE="${LOCAL_DIR}/${FILENAME}"

mkdir -p "$LOCAL_DIR" "$(dirname "$LOG_FILE")"
trap 'rm -f "$TMP_FILE"' EXIT

log "Creating PostgreSQL custom dump"
pg_dump -Fc "$AUTH_DATABASE_URL" -f "$TMP_FILE"
chmod 0600 "$TMP_FILE"
mv "$TMP_FILE" "$FINAL_FILE"

log "Uploading dump to Object Storage"
aws --endpoint-url "$S3_ENDPOINT_URL" s3 cp \
  "$FINAL_FILE" "s3://${VNUTRI_BACKUP_BUCKET}/${PREFIX}/${FILENAME}" \
  >/dev/null

log "Pruning local dumps, keeping latest 2"
find "$LOCAL_DIR" -maxdepth 1 -type f -name 'vnutri-*.dump' -print \
  | sort \
  | head -n -2 \
  | xargs -r rm -f

log "Backup completed: ${FILENAME}"
