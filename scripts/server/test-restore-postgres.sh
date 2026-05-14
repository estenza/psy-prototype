#!/usr/bin/env bash
set -euo pipefail

BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/etc/vnutri/backup.env}"
LOG_FILE="${LOG_FILE:-/var/log/vnutri/restore-check.log}"
TEST_DB="${TEST_DB:-vnutri_restore_test}"
KEEP_DB="false"

log() {
  printf '[test-restore-postgres] %s\n' "$*" | tee -a "$LOG_FILE"
}

die() {
  printf '[test-restore-postgres] ERROR: %s\n' "$*" | tee -a "$LOG_FILE" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-db)
      KEEP_DB="true"
      shift
      ;;
    -h|--help)
      echo "Usage: scripts/server/test-restore-postgres.sh [--keep-db]"
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -f "$BACKUP_ENV_FILE" ]] || die "Missing backup env file: $BACKUP_ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$BACKUP_ENV_FILE"
set +a

[[ -n "${VNUTRI_BACKUP_BUCKET:-}" ]] || die "VNUTRI_BACKUP_BUCKET is required."
[[ -n "${S3_ENDPOINT_URL:-}" ]] || die "S3_ENDPOINT_URL is required."

PREFIX="${VNUTRI_BACKUP_PREFIX:-postgres}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

latest_key="$(
  aws --endpoint-url "$S3_ENDPOINT_URL" s3 ls "s3://${VNUTRI_BACKUP_BUCKET}/${PREFIX}/" \
    | awk '{print $4}' \
    | grep '^vnutri-.*\.dump$' \
    | sort \
    | tail -n 1 \
    || true
)"

[[ -n "$latest_key" ]] || die "No backups found in s3://${VNUTRI_BACKUP_BUCKET}/${PREFIX}/"

local_dump="${WORK_DIR}/${latest_key}"
log "Downloading ${latest_key}"
aws --endpoint-url "$S3_ENDPOINT_URL" s3 cp \
  "s3://${VNUTRI_BACKUP_BUCKET}/${PREFIX}/${latest_key}" "$local_dump" \
  >/dev/null

log "Recreating test database ${TEST_DB}"
sudo -u postgres dropdb --if-exists "$TEST_DB"
sudo -u postgres createdb "$TEST_DB"

log "Restoring backup into ${TEST_DB}"
sudo -u postgres pg_restore --no-owner --no-acl --dbname "$TEST_DB" "$local_dump"

log "Checking restored tables"
print_table_count() {
  local table_name="$1"
  local exists
  exists="$(sudo -u postgres psql -Atqc "SELECT to_regclass('public.${table_name}') IS NOT NULL;" -d "$TEST_DB")"

  if [[ "$exists" == "t" ]]; then
    local row_count
    row_count="$(sudo -u postgres psql -Atqc "SELECT COUNT(*) FROM public.${table_name};" -d "$TEST_DB")"
    log "${table_name}=${row_count}"
  else
    log "${table_name}=missing"
  fi
}

print_table_count users
print_table_count posts
print_table_count post_comments
print_table_count specialist_applications

if [[ "$KEEP_DB" != "true" ]]; then
  log "Dropping test database ${TEST_DB}"
  sudo -u postgres dropdb "$TEST_DB"
else
  log "Keeping test database ${TEST_DB}"
fi

log "Restore check completed"
