#!/usr/bin/env bash
# Runs on the target VPS via SSH from GitHub Actions.
# Pulls the freshly-built images and restarts the stack in place.
set -euo pipefail

APP_DIR="/opt/debridgers"
IMAGE_TAG="${1:?Usage: deploy.sh <image-tag>}"

cd "${APP_DIR}"

echo "==> Deploying Debridgers:${IMAGE_TAG}"
export IMAGE_TAG

echo "==> Persisting IMAGE_TAG to .env for future manual commands"
sed -i '/^IMAGE_TAG=/d' .env
echo "IMAGE_TAG=${IMAGE_TAG}" >> .env

# Load environment variables for tunnel config
set -a
# shellcheck disable=SC1091
source .env
set +a
: "${TUNNEL_ID:?TUNNEL_ID must be set in ${APP_DIR}/.env}"

echo "==> Rendering cloudflared config for tunnel ${TUNNEL_ID}"
if [ ! -s cloudflared/creds.json ]; then
  echo "cloudflared/creds.json is missing or empty — tunnel cannot authenticate" >&2
  exit 1
fi
sed -e "s|__TUNNEL_ID__|${TUNNEL_ID}|" \
    cloudflared/config.template.yml > cloudflared/config.yml

# The cloudflared image runs as the non-root user 65532, so root-owned files
# it needs are unreadable inside the container.
chmod 644 cloudflared/config.yml
chown 65532:65532 cloudflared/creds.json 2>/dev/null || true
chmod 600 cloudflared/creds.json 2>/dev/null || true

echo "==> Pulling latest images"
docker compose pull debridgers-backend debridgers-frontend

echo "==> Starting services"
docker compose up -d --remove-orphans

# Cloudflared needs to be recreated when config changes
docker compose up -d --force-recreate cloudflared

echo "==> Pruning old images"
docker image prune -f

echo "==> Current status"
docker compose ps

echo "==> Smoke test https://api-test.debridgers.com/api/v1/health"
for attempt in $(seq 1 12); do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "https://api-test.debridgers.com/api/v1/health" || true)
  if [ "${code}" = "200" ]; then
    echo "==> Smoke test passed"
    exit 0
  fi
  echo "    attempt ${attempt}/12: HTTP ${code}, retrying in 5s"
  sleep 5
done

echo "==> Smoke test FAILED: api-test.debridgers.com never returned 200" >&2
echo "==> Recent backend logs:" >&2
docker compose logs --tail 40 debridgers-backend >&2 || true
echo "==> Recent cloudflared logs:" >&2
docker compose logs --tail 40 cloudflared >&2 || true
exit 1
