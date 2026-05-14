#!/usr/bin/env bash
set -euo pipefail

APP_ENV_FILE="${APP_ENV_FILE:-/etc/vnutri/app.env}"
LOG_FILE="${LOG_FILE:-/var/log/vnutri/disk-check.log}"
WARNING_THRESHOLD="${WARNING_THRESHOLD:-80}"
CRITICAL_THRESHOLD="${CRITICAL_THRESHOLD:-90}"
CHECK_PATHS=("/" "/var" "/var/backups/vnutri")

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  printf '[check-disk] %s\n' "$*" | tee -a "$LOG_FILE"
}

send_telegram() {
  local message="$1"

  if [[ -f "$APP_ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$APP_ENV_FILE"
    set +a
  fi

  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${message}" \
      >/dev/null || true
  fi
}

status=0

for path in "${CHECK_PATHS[@]}"; do
  [[ -e "$path" ]] || continue
  usage="$(df -P "$path" | awk 'NR == 2 { gsub("%", "", $5); print $5 }')"
  if [[ "$usage" -ge "$CRITICAL_THRESHOLD" ]]; then
    message="CRITICAL: ${path} disk usage is ${usage}%"
    log "$message"
    send_telegram "$message"
    status=2
  elif [[ "$usage" -ge "$WARNING_THRESHOLD" ]]; then
    message="WARNING: ${path} disk usage is ${usage}%"
    log "$message"
    send_telegram "$message"
  else
    log "OK: ${path} disk usage is ${usage}%"
  fi
done

exit "$status"
