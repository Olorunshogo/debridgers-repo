#!/usr/bin/env bash
# One-time setup for a fresh Hetzner VPS (dev or prod).
# Run once per VPS: ssh root@<vps-ip> 'bash -s' < deploy/bootstrap.sh
set -euo pipefail

APP_DIR="/opt/debridgers"
DEPLOY_USER="debridgers_dev1"

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  echo "    Docker installed"
else
  echo "    Docker already installed"
fi
systemctl enable --now docker

echo "==> Creating deployment user: ${DEPLOY_USER}"
if id "$DEPLOY_USER" &>/dev/null; then
  echo "    User already exists"
else
  useradd -m -s /bin/bash -G docker "$DEPLOY_USER"
  echo "    User created and added to docker group"
fi

echo "==> Creating app directories at ${APP_DIR}"
mkdir -p "${APP_DIR}/logs"
mkdir -p "${APP_DIR}/cloudflared"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> Configuring firewall (ufw)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH
  ufw --force enable
  echo "    Firewall configured (SSH allowed, all other inbound blocked)"
else
  echo "    ufw not available (firewall may need manual configuration)"
fi

echo ""
echo "==> Bootstrap complete!"
echo ""
echo "Next: Run deploy/setup-vps.sh on your local machine to complete VPS setup:"
echo ""
echo "  ./setup-vps.sh root@${APP_DIR} <vps-ip>"
echo ""
echo "This will:"
echo "  • Copy docker-compose and deploy scripts to VPS"
echo "  • Interactively configure secrets (.env file)"
echo "  • Install Cloudflare tunnel credentials"
echo "  • Test Docker and database connectivity"
echo "  • Verify everything is ready for deployment"
echo ""
