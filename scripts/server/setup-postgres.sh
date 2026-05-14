#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${VNUTRI_DB_NAME:-vnutri}"
DB_USER="${VNUTRI_DB_USER:-vnutri_app}"
DB_PASSWORD="${VNUTRI_DB_PASSWORD:-}"

log() {
  printf '[setup-postgres] %s\n' "$*"
}

die() {
  printf '[setup-postgres] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || die "Run as root via sudo."

if [[ -z "$DB_PASSWORD" ]]; then
  read -rsp "Password for PostgreSQL role ${DB_USER}: " DB_PASSWORD
  printf '\n'
fi

[[ -n "$DB_PASSWORD" ]] || die "Database password cannot be empty."

run_psql() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 "$@"
}

log "Configuring PostgreSQL password encryption"
run_psql -d postgres -c "ALTER SYSTEM SET password_encryption = 'scram-sha-256';"

log "Creating role and database if needed"
run_psql -d postgres -v db_name="$DB_NAME" -v db_user="$DB_USER" -v db_password="$DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')\gexec
ALTER ROLE :"db_user" WITH LOGIN PASSWORD :'db_password';
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')\gexec
SQL

log "Granting database privileges"
run_psql -d "$DB_NAME" -v db_name="$DB_NAME" -v db_user="$DB_USER" <<'SQL'
GRANT CONNECT ON DATABASE :"db_name" TO :"db_user";
GRANT USAGE, CREATE ON SCHEMA public TO :"db_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"db_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"db_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"db_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"db_user";
SQL

CONFIG_FILE="$(sudo -u postgres psql -Atqc 'SHOW config_file;' postgres)"
log "Restricting PostgreSQL listen_addresses in $CONFIG_FILE"
if grep -Eq "^[#[:space:]]*listen_addresses[[:space:]]*=" "$CONFIG_FILE"; then
  sed -i "s/^[#[:space:]]*listen_addresses[[:space:]]*=.*/listen_addresses = 'localhost'/" "$CONFIG_FILE"
else
  printf "\nlisten_addresses = 'localhost'\n" >> "$CONFIG_FILE"
fi

systemctl restart postgresql

log "Checking PostgreSQL listener"
if ss -lntp | awk '$4 ~ /:5432$/ { print $4 }' | grep -Eq '(^|:)(0\.0\.0\.0|\*):5432$|^\[::\]:5432$'; then
  ss -lntp | awk '$4 ~ /:5432$/'
  die "PostgreSQL appears to be listening on a public interface."
fi

log "DSN template: postgresql://${DB_USER}:<password>@127.0.0.1:5432/${DB_NAME}"
log "Done"
