#!/usr/bin/env bash
# One-time setup for a fresh Hetzner VPS (dev or prod).
# Run once per VPS: ssh root@<vps-ip> 'bash -s' < deploy/bootstrap.sh
set -euo pipefail

APP_DIR="/opt/debridgers"

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Creating app directory at ${APP_DIR}"
mkdir -p "${APP_DIR}/logs"
mkdir -p "${APP_DIR}/cloudflared"

echo "==> Configuring firewall (ufw)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH
  ufw --force enable
fi
# No inbound app ports are opened — cloudflared makes an outbound-only
# connection to Cloudflare's edge, so the backend is never exposed directly.

cat <<'EOF'

==> Bootstrap complete.

Next steps:
  1. Copy deploy/docker-compose.prod.yml to /opt/debridgers/docker-compose.yml on this VPS.
  2. Copy deploy/cloudflared/config.template.yml to /opt/debridgers/cloudflared/config.template.yml.
  3. Create /opt/debridgers/.env with:
     - DATABASE_URL (Neon connection string)
     - All app secrets (API keys, auth tokens, etc.)
     - TUNNEL_ID (from Cloudflare tunnel)
  4. Install tunnel credentials:
     - Download credentials.json from Cloudflare
     - Save to /opt/debridgers/cloudflared/creds.json (mode 600, owner 65532:65532)
  5. Add this VPS's SSH details as Codeberg Actions secrets (SSH_HOST, SSH_USER, SSH_PRIVATE_KEY).
  6. Add ENV_FILE and CODEBERG_TOKEN secrets to the Codeberg environment.
  7. Push to develop (dev VPS) or main (prod VPS) to trigger the first deploy.

No nginx or SSL setup needed — Cloudflare Tunnel handles all routing and HTTPS!
EOF
