#!/usr/bin/env bash
# Runs on the target VPS via SSH from CI.
# Pulls (or reuses) a pre-built image and restarts the stack.
set -euo pipefail

APP_DIR="/opt/debridgers"
IMAGE_TAG="${1:?Usage: deploy.sh <image-tag>}"
REGISTRY="docker.io"
IMAGE_NAME="1techhunter/debridgers"
# Pin the project name so down/up always target the same containers,
# regardless of whether the compose file lives at deploy/ or APP_DIR root.
export COMPOSE_PROJECT_NAME="debridgers"

cd "${APP_DIR}"

# Prefer the file CI scps to the root; fall back to the in-tree path from a
# full checkout/tarball. Always use one absolute path so project identity
# cannot drift between runs.
if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
  COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
elif [[ -f "${APP_DIR}/deploy/docker-compose.prod.yml" ]]; then
  COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"
else
  echo "==> No compose file at ${APP_DIR}/docker-compose.yml or deploy/docker-compose.prod.yml" >&2
  exit 1
fi

compose() {
  IMAGE_TAG="${IMAGE_TAG}" \
    CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" \
    COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" \
    docker compose -f "${COMPOSE_FILE}" "$@"
}

# Env may live at APP_DIR/.env (CI ENV_FILE) or deploy/.env (older layout).
ENV_FILE=""
if [[ -f "${APP_DIR}/.env" ]]; then
  ENV_FILE="${APP_DIR}/.env"
elif [[ -f "${APP_DIR}/deploy/.env" ]]; then
  ENV_FILE="${APP_DIR}/deploy/.env"
else
  echo "==> No .env at ${APP_DIR}/.env or ${APP_DIR}/deploy/.env" >&2
  exit 1
fi

echo "==> Deploying Debridgers:${IMAGE_TAG}"
echo "==> Compose file: ${COMPOSE_FILE}"
echo "==> Env file: ${ENV_FILE}"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
: "${CLOUDFLARE_TUNNEL_CREDENTIALS:?CLOUDFLARE_TUNNEL_CREDENTIALS must be set in ${ENV_FILE}}"

echo "==> Persisting IMAGE_TAG to ${ENV_FILE}"
grep -v '^IMAGE_TAG=' "${ENV_FILE}" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "${ENV_FILE}" || true
echo "IMAGE_TAG=${IMAGE_TAG}" >> "${ENV_FILE}"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# Prefer a local image (CI just built it on this VPS). Pulling first would
# overwrite a good local build with a stale/broken Hub tag of the same SHA.
if docker image inspect "${FULL_IMAGE}" >/dev/null 2>&1 \
  || docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1; then
  echo "==> Using local ${FULL_IMAGE}"
elif compose pull debridgers-backend; then
  echo "==> Pulled ${FULL_IMAGE}"
else
  echo "==> Pull failed and image is not local" >&2
  exit 1
fi

echo "==> Stopping and removing old containers"
# Tear down every known project name from prior path drift, then force-remove
# the fixed container_name values. Name conflicts on cloudflared come from a
# previous compose project that `down` on this file alone does not own.
for project in debridgers deploy; do
  COMPOSE_PROJECT_NAME="${project}" compose down --remove-orphans || true
done
export COMPOSE_PROJECT_NAME="debridgers"

for name in debridgers-backend debridgers-cloudflared; do
  if docker container inspect "${name}" >/dev/null 2>&1; then
    echo "==> Removing leftover container ${name}"
    docker rm -f "${name}" || true
  fi
done

echo "==> Starting services"
compose up -d --force-recreate --remove-orphans

echo "==> Skipping database migrations (run locally before deployment)"

echo "==> Pruning old images"
docker image prune -f

echo "==> Current status"
compose ps

echo "==> Waiting for backend health"
deadline=$((SECONDS + 120))
while (( SECONDS < deadline )); do
  if compose ps debridgers-backend 2>/dev/null | grep -q "healthy"; then
    echo "==> Deployment successful: backend is healthy"
    exit 0
  fi
  # Still starting: keep waiting. Failed/exited: surface logs early.
  if compose ps debridgers-backend 2>/dev/null | grep -Eq "Exit|exited|unhealthy"; then
    break
  fi
  sleep 5
done

echo "==> Backend is not healthy" >&2
echo "==> Backend status:" >&2
compose ps debridgers-backend >&2 || true
echo "==> Recent backend logs:" >&2
compose logs --tail 50 debridgers-backend >&2 || true
exit 1
