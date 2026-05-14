#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vnutri/app}"
APP_ENV_FILE="${APP_ENV_FILE:-/etc/vnutri/app.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vnutri/pre-import}"
REQUIRED_MIGRATION="${REQUIRED_MIGRATION:-0015_specialist_contact_links}"
DUMP_PATH=""
CONFIRM_OVERWRITE="false"

log() {
  printf '[import-managed-postgres-dump] %s\n' "$*"
}

die() {
  printf '[import-managed-postgres-dump] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage: scripts/server/import-managed-postgres-dump.sh --dump /path/file.dump [--confirm-overwrite]

Restores a managed PostgreSQL custom dump into the local VM PostgreSQL database.
Existing data is not overwritten unless --confirm-overwrite is passed.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)
      DUMP_PATH="${2:-}"
      shift 2
      ;;
    --confirm-overwrite)
      CONFIRM_OVERWRITE="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$DUMP_PATH" ]] || die "--dump is required."
[[ -f "$DUMP_PATH" ]] || die "Dump file does not exist: $DUMP_PATH"
[[ -f "$APP_ENV_FILE" ]] || die "Missing env file: $APP_ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$APP_ENV_FILE"
set +a

[[ -n "${AUTH_DATABASE_URL:-}" ]] || die "AUTH_DATABASE_URL is required."

table_count="$(psql "$AUTH_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")"
if [[ "$table_count" != "0" && "$CONFIRM_OVERWRITE" != "true" ]]; then
  die "Target database has ${table_count} public tables. Re-run with --confirm-overwrite to restore with --clean."
fi

mkdir -p "$BACKUP_DIR"
safety_dump="${BACKUP_DIR}/before-import-$(date -u +%Y%m%dT%H%M%SZ).dump"

log "Creating safety dump of current VM database"
pg_dump -Fc "$AUTH_DATABASE_URL" -f "$safety_dump"
chmod 0600 "$safety_dump"

restore_args=(--no-owner --no-acl --dbname "$AUTH_DATABASE_URL")
if [[ "$CONFIRM_OVERWRITE" == "true" ]]; then
  restore_args=(--clean --if-exists "${restore_args[@]}")
fi

log "Restoring dump"
pg_restore "${restore_args[@]}" "$DUMP_PATH"

cd "$APP_DIR"

log "Running migrations"
yarn migrate:auth:postgres:schema
yarn migrate:auth:postgres:schema

log "Checking migration ${REQUIRED_MIGRATION}"
[[ "$REQUIRED_MIGRATION" =~ ^[0-9]{4}_[A-Za-z0-9_]+$ ]] || die "Invalid migration name: ${REQUIRED_MIGRATION}"
migration_count="$(psql "$AUTH_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM schema_migrations WHERE version = '${REQUIRED_MIGRATION}';")"
[[ "$migration_count" == "1" ]] || die "Missing required migration ${REQUIRED_MIGRATION}."

log "Table counts"
print_table_count() {
  local table_name="$1"
  local exists
  exists="$(psql "$AUTH_DATABASE_URL" -Atqc "SELECT to_regclass('public.${table_name}') IS NOT NULL;")"

  if [[ "$exists" == "t" ]]; then
    local row_count
    row_count="$(psql "$AUTH_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.${table_name};")"
    log "${table_name}=${row_count}"
  else
    log "${table_name}=missing"
  fi
}

print_table_count users
print_table_count posts
print_table_count post_comments
print_table_count specialist_applications

log "Import completed. Safety dump: ${safety_dump}"
