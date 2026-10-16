#!/usr/bin/env bash
# Backup the PostgreSQL database to an independently hosted encrypted rclone remote.
# Prerequisites: Docker Compose, rclone, a configured rclone crypt remote named "offsitecrypt".
set -Eeuo pipefail
umask 077

DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose --project-directory "$DIR" -f "$DIR/compose.yml" --env-file "$DIR/.env")

if [[ ! -f "$DIR/.env" ]]; then
  echo "Missing $DIR/.env" >&2
  exit 1
fi

command -v rclone >/dev/null || { echo "rclone is required" >&2; exit 1; }
rclone listremotes | grep -Fxq 'offsitecrypt:' || {
  echo 'Configure encrypted rclone remote: offsitecrypt:' >&2
  exit 1
}

tmp="$(mktemp --suffix=.dump)"
trap 'rm -f -- "$tmp"' EXIT

"${COMPOSE[@]}" exec -T db sh -ec \
  'exec pg_dump -Fc --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$tmp"

if [[ ! -s "$tmp" ]]; then
  echo "pg_dump returned an empty file; refusing upload." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
rclone copyto --checksum "$tmp" "offsitecrypt:vnutri/$(hostname -s)/$stamp.dump"
echo "Encrypted remote backup uploaded: $stamp.dump"
