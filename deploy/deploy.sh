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
: "${CLOUDFLARE_TUNNEL_CREDENTIALS:?CLOUDFLARE_TUNNEL_CREDENTIALS must be set in ${APP_DIR}/deploy/.env}"

echo "==> Persisting IMAGE_TAG to .env for future manual commands"
grep -v '^IMAGE_TAG=' deploy/.env > deploy/.env.tmp && mv deploy/.env.tmp deploy/.env || true
echo "IMAGE_TAG=${IMAGE_TAG}" >> deploy/.env

# Re-source to pick up the updated IMAGE_TAG
set -a
source deploy/.env
set +a

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "==> Pulling ${FULL_IMAGE} (skip if already present locally)"
if ! IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" \
  docker compose -f deploy/docker-compose.prod.yml pull debridgers-backend; then
  if docker image inspect "${FULL_IMAGE}" >/dev/null 2>&1 \
    || docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1; then
    echo "==> Pull failed but ${FULL_IMAGE} exists locally — restarting with local image"
  else
    echo "==> Pull failed and image is not local" >&2
    exit 1
  fi
fi

echo "==> Stopping and removing old containers"
IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" docker compose -f deploy/docker-compose.prod.yml down || true

echo "==> Starting services"
IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate

echo "==> Skipping database migrations (run locally before deployment)"

echo "==> Pruning old images"
docker image prune -f

echo "==> Current status"
IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" docker compose -f deploy/docker-compose.prod.yml ps

echo "==> Checking backend health status (waiting for startup...)"
sleep 65

# Check if backend container is healthy (Docker healthcheck)
if IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" docker compose -f deploy/docker-compose.prod.yml ps debridgers-backend | grep -q "healthy"; then
  echo "==> ✅ Deployment successful: backend is healthy"
  exit 0
fi

echo "==> ❌ Backend is not healthy" >&2
echo "==> Backend status:" >&2
IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" docker compose -f deploy/docker-compose.prod.yml ps debridgers-backend >&2
echo "==> Recent backend logs:" >&2
IMAGE_TAG="${IMAGE_TAG}" CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" docker compose -f deploy/docker-compose.prod.yml logs --tail 30 debridgers-backend >&2 || true
exit 1
