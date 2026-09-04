#!/usr/bin/env bash
# Runs on the target VPS via SSH from GitHub Actions.
# Pulls pre-built image and deploys.
set -euo pipefail

APP_DIR="/opt/debridgers"
IMAGE_TAG="${1:?Usage: deploy.sh <image-tag>}"
REGISTRY="docker.io"
IMAGE_NAME="1techhunter/debridgers"

cd "${APP_DIR}"

echo "==> Deploying Debridgers:${IMAGE_TAG}"

# Load environment variables for tunnel config
set -a
# shellcheck disable=SC1091
source deploy/.env
set +a
: "${TUNNEL_ID:?TUNNEL_ID must be set in ${APP_DIR}/deploy/.env}"

echo "==> Persisting IMAGE_TAG to .env for future manual commands"
grep -v '^IMAGE_TAG=' deploy/.env > deploy/.env.tmp && mv deploy/.env.tmp deploy/.env || true
echo "IMAGE_TAG=${IMAGE_TAG}" >> deploy/.env

# Re-source to pick up the updated IMAGE_TAG
set -a
source deploy/.env
set +a

echo "==> Rendering cloudflared config for tunnel ${TUNNEL_ID}"
if [ ! -s cloudflared/creds.json ]; then
  echo "cloudflared/creds.json is missing or empty — tunnel cannot authenticate" >&2
  exit 1
fi
sed -e "s|__TUNNEL_ID__|${TUNNEL_ID}|" \
    cloudflared/config.template.yml > cloudflared/config.yml

chmod 644 cloudflared/config.yml
if id 65532 >/dev/null 2>&1; then
  chown 65532:65532 cloudflared/creds.json
  chmod 600 cloudflared/creds.json
else
  chmod 644 cloudflared/creds.json
fi

echo "==> Pulling latest images"
IMAGE_TAG="${IMAGE_TAG}" docker compose -f deploy/docker-compose.prod.yml pull debridgers-backend

echo "==> Removing old containers if they exist"
docker rm -f debridgers-backend debridgers-cloudflared || true

echo "==> Starting services"
IMAGE_TAG="${IMAGE_TAG}" docker compose -f deploy/docker-compose.prod.yml up -d --remove-orphans

echo "==> Skipping database migrations (run locally before deployment)"

echo "==> Pruning old images"
docker image prune -f

echo "==> Current status"
IMAGE_TAG="${IMAGE_TAG}" docker compose -f deploy/docker-compose.prod.yml ps

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
docker compose -f deploy/docker-compose.prod.yml logs --tail 40 debridgers-backend >&2 || true
echo "==> Recent cloudflared logs:" >&2
docker compose -f deploy/docker-compose.prod.yml logs --tail 40 cloudflared >&2 || true
exit 1
