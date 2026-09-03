#!/usr/bin/env bash

# === Stood down
# Deployment is deferred. This script is intentionally inert. The body below is
# kept intact and reviewed, so re-enabling is deleting these five lines.
echo "deploy/bootstrap.sh is stood down. Delete the guard at the top of the file to re-enable." >&2
exit 1

set -euo pipefail

# One-time host setup for the Debridgers API.
#
# Run as root on a fresh Ubuntu or Debian VPS:
#   sudo bash bootstrap.sh <deploy-user>
#
# Installs Docker, closes the firewall to everything except SSH, and creates
# /opt/debridgers with the placeholder files the first deploy expects. It is
# safe to re-run: every step checks before it acts.

APP_DIR="/opt/debridgers"
DEPLOY_USER="${1:-${SUDO_USER:-}}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "bootstrap.sh must run as root" >&2
  exit 1
fi

if [[ -z "${DEPLOY_USER}" ]]; then
  echo "Usage: sudo bash bootstrap.sh <deploy-user>" >&2
  exit 1
fi

if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  echo "User ${DEPLOY_USER} does not exist. Create it before running this." >&2
  exit 1
fi

# === Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
else
  echo "Docker already installed, skipping."
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is missing. Install docker-compose-plugin and re-run." >&2
  exit 1
fi

systemctl enable --now docker

# The deploy user drives compose over SSH, so it needs the docker group. The new
# group does not apply to sessions that are already open, including this one.
if ! id -nG "${DEPLOY_USER}" | tr ' ' '\n' | grep -qx docker; then
  usermod -aG docker "${DEPLOY_USER}"
  echo "Added ${DEPLOY_USER} to the docker group. Existing SSH sessions must reconnect."
fi

# === Firewall
# The tunnel dials out, so nothing needs to reach this host except SSH. Allowing
# SSH before enabling ufw matters: enabling first locks you out of your own box.
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH
  ufw default deny incoming
  ufw default allow outgoing
  ufw --force enable
  ufw status verbose
else
  echo "ufw is not installed. Install it or close inbound ports another way." >&2
fi

# === Application directory
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}"
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}/cloudflared"
install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}/env-backups"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  # Created empty and host-owned. deploy.sh fills the application keys from the
  # CI secret but never touches the three below, which belong to this host.
  cat >"${APP_DIR}/.env" <<'EOF'
# Host-managed keys. deploy.sh preserves these across every deploy; they are
# deliberately not carried in the CI secret.
TUNNEL_ID=
API_HOSTNAME=
IMAGE_TAG=

# Everything below is overwritten from the CI environment secret on each deploy.
EOF
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  echo "Created ${APP_DIR}/.env. Fill in TUNNEL_ID and API_HOSTNAME before deploying."
fi

cat <<EOF

Bootstrap complete.

Still to do by hand, once:
  1. Create the tunnel and copy its credentials JSON to
     ${APP_DIR}/cloudflared/credentials.json
  2. Set TUNNEL_ID and API_HOSTNAME in ${APP_DIR}/.env
  3. Point API_HOSTNAME at <TUNNEL_ID>.cfargotunnel.com with a proxied CNAME
  4. Add the deploy user's SSH public key to ~${DEPLOY_USER}/.ssh/authorized_keys

See docs/deployment.md for the full sequence.
EOF
