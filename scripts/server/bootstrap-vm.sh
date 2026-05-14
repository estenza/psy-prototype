#!/usr/bin/env bash
set -euo pipefail

SSH_ALLOW_CIDR=""

log() {
  printf '[bootstrap-vm] %s\n' "$*"
}

die() {
  printf '[bootstrap-vm] ERROR: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssh-allow)
      SSH_ALLOW_CIDR="${2:-}"
      [[ -n "$SSH_ALLOW_CIDR" ]] || die "--ssh-allow requires a CIDR value"
      shift 2
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: sudo scripts/server/bootstrap-vm.sh [--ssh-allow <ip-or-cidr>]

Installs the VM runtime dependencies and prepares directories for vnutri.live.
Pass --ssh-allow to enable UFW safely with SSH limited to that address/range.
USAGE
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ "$(id -u)" -eq 0 ]] || die "Run as root via sudo."

export DEBIAN_FRONTEND=noninteractive

log "Updating apt metadata and packages"
apt-get update
apt-get upgrade -y

log "Installing base packages"
apt-get install -y ca-certificates curl gnupg git ufw unzip jq rsync \
  postgresql postgresql-contrib nginx certbot python3-certbot-nginx awscli

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" != "22" ]]; then
  log "Installing Node.js 22"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi

log "Enabling Corepack and installing PM2"
corepack enable
npm install -g pm2

if ! id vnutri >/dev/null 2>&1; then
  log "Creating user vnutri"
  useradd --system --create-home --home-dir /opt/vnutri --shell /bin/bash vnutri
fi

log "Creating runtime directories"
install -d -o vnutri -g vnutri -m 0755 /opt/vnutri/app
install -d -o root -g vnutri -m 0750 /etc/vnutri
install -d -o vnutri -g vnutri -m 0750 /var/backups/vnutri
install -d -o vnutri -g vnutri -m 0750 /var/log/vnutri

if compgen -G "/etc/vnutri/*.env" >/dev/null; then
  chmod 0640 /etc/vnutri/*.env
  chown root:vnutri /etc/vnutri/*.env
fi

log "Enabling services"
systemctl enable --now postgresql
systemctl enable --now nginx

log "Configuring UFW"
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 5432/tcp

if [[ -n "$SSH_ALLOW_CIDR" ]]; then
  ufw allow from "$SSH_ALLOW_CIDR" to any port 22 proto tcp
  ufw --force enable
  log "UFW enabled with SSH limited to $SSH_ALLOW_CIDR"
else
  log "UFW rules prepared, but firewall was not enabled because --ssh-allow was not provided."
  log "Run again with --ssh-allow <your-ip>/32 after confirming SSH access."
fi

log "Done"
