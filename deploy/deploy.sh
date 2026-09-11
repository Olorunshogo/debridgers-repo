#!/usr/bin/env bash
# Runs on the target VPS via SSH from CI.
# Usage: deploy.sh <image-tag> <dev|prod>
#
# One VPS, two stacks:
#   prod → /opt/debridgers/prod  host port 4002  (api-test.debridgers.com - staging and production share this hostname)
#   dev  → /opt/debridgers/dev   host port 4001  (api-test.debridgers.com)
# Each stack has its own .env (and therefore its own DATABASE_URL).
set -euo pipefail

REQUESTED_TAG="${1:?Usage: deploy.sh <image-tag> <dev|prod>}"
DEPLOY_ENV="${2:?Usage: deploy.sh <image-tag> <dev|prod>}"

case "${DEPLOY_ENV}" in
  dev)
    APP_DIR="/opt/debridgers/dev"
    HOST_PORT="4001"
    ;;
  prod)
    APP_DIR="/opt/debridgers/prod"
    HOST_PORT="4002"
    ;;
  *)
    echo "==> DEPLOY_ENV must be 'dev' or 'prod' (got: ${DEPLOY_ENV})" >&2
    exit 1
    ;;
esac

IMAGE_TAG="${REQUESTED_TAG}"
REGISTRY="docker.io"
IMAGE_NAME="1techhunter/debridgers"
ROOT_DIR="/opt/debridgers"
export COMPOSE_PROJECT_NAME="debridgers-${DEPLOY_ENV}"
export DEPLOY_ENV
export HOST_PORT

cd "${APP_DIR}"

if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
  COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
elif [[ -f "${ROOT_DIR}/deploy/docker-compose.prod.yml" ]]; then
  COMPOSE_FILE="${ROOT_DIR}/deploy/docker-compose.prod.yml"
else
  echo "==> No compose file at ${APP_DIR}/docker-compose.yml" >&2
  exit 1
fi

compose() {
  IMAGE_TAG="${IMAGE_TAG}" \
    DEPLOY_ENV="${DEPLOY_ENV}" \
    HOST_PORT="${HOST_PORT}" \
    COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}" \
    docker compose -f "${COMPOSE_FILE}" "$@"
}

ENV_FILE=""
if [[ -f "${APP_DIR}/.env" ]]; then
  ENV_FILE="${APP_DIR}/.env"
else
  echo "==> No .env at ${APP_DIR}/.env" >&2
  exit 1
fi

echo "==> Deploying Debridgers:${REQUESTED_TAG} (${DEPLOY_ENV})"
echo "==> App dir: ${APP_DIR}"
echo "==> Host port: ${HOST_PORT}"
echo "==> Compose file: ${COMPOSE_FILE}"
echo "==> Env file: ${ENV_FILE}"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
IMAGE_TAG="${REQUESTED_TAG}"
export IMAGE_TAG
: "${CLOUDFLARE_TUNNEL_CREDENTIALS:?CLOUDFLARE_TUNNEL_CREDENTIALS must be set in ${ENV_FILE}}"

echo "==> Persisting IMAGE_TAG=${IMAGE_TAG} to ${ENV_FILE}"
grep -v '^IMAGE_TAG=' "${ENV_FILE}" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "${ENV_FILE}" || true
echo "IMAGE_TAG=${IMAGE_TAG}" >> "${ENV_FILE}"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
IMAGE_TAG="${REQUESTED_TAG}"
export IMAGE_TAG
export DEPLOY_ENV
export HOST_PORT

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
echo "==> Target image: ${FULL_IMAGE}"

if docker image inspect "${FULL_IMAGE}" >/dev/null 2>&1 \
  || docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1; then
  echo "==> Using local ${FULL_IMAGE}"
elif compose pull debridgers-backend; then
  echo "==> Pulled ${FULL_IMAGE}"
else
  echo "==> Pull failed and image is not local" >&2
  exit 1
fi

echo "==> Stopping and removing old ${DEPLOY_ENV} containers"
compose down --remove-orphans || true

# Pre-split compose bound both 4001 and 4002 on one container named
# debridgers-backend. That blocks debridgers-backend-dev/prod from starting.
# Tear it down on every env deploy, then retire the file so nothing restarts it.
LEGACY_COMPOSE="${ROOT_DIR}/docker-compose.yml"
if [[ -f "${LEGACY_COMPOSE}" ]]; then
  echo "==> Stopping legacy single-stack backend from ${LEGACY_COMPOSE}"
  COMPOSE_PROJECT_NAME="debridgers" \
    docker compose -f "${LEGACY_COMPOSE}" stop debridgers-backend 2>/dev/null || true
  COMPOSE_PROJECT_NAME="debridgers" \
    docker compose -f "${LEGACY_COMPOSE}" rm -f debridgers-backend 2>/dev/null || true
  if [[ ! -e "${ROOT_DIR}/docker-compose.yml.pre-dual-stack" ]]; then
    mv "${LEGACY_COMPOSE}" "${ROOT_DIR}/docker-compose.yml.pre-dual-stack"
  else
    rm -f "${LEGACY_COMPOSE}"
  fi
fi

if docker container inspect debridgers-backend >/dev/null 2>&1; then
  echo "==> Removing legacy container debridgers-backend"
  docker rm -f debridgers-backend || true
fi

BACKEND_NAME="debridgers-backend-${DEPLOY_ENV}"
if docker container inspect "${BACKEND_NAME}" >/dev/null 2>&1; then
  echo "==> Removing leftover container ${BACKEND_NAME}"
  docker rm -f "${BACKEND_NAME}" || true
fi

echo "==> Starting ${DEPLOY_ENV} backend"
compose up -d --force-recreate --remove-orphans

# One tunnel for the whole host. The pre-split compose also named it
# debridgers-cloudflared; if that container is already running, leave it.
TUNNEL_COMPOSE="${ROOT_DIR}/docker-compose.tunnel.yml"
if [[ ! -f "${TUNNEL_COMPOSE}" && -f "${ROOT_DIR}/deploy/docker-compose.tunnel.yml" ]]; then
  TUNNEL_COMPOSE="${ROOT_DIR}/deploy/docker-compose.tunnel.yml"
fi
if [[ -f "${TUNNEL_COMPOSE}" ]]; then
  echo "==> Ensuring shared Cloudflare tunnel is up"
  if docker ps --format '{{.Names}}' | grep -qx 'debridgers-cloudflared'; then
    echo "==> debridgers-cloudflared already running; leaving shared tunnel alone"
  else
    docker rm -f debridgers-cloudflared 2>/dev/null || true
    CLOUDFLARE_TUNNEL_CREDENTIALS="${CLOUDFLARE_TUNNEL_CREDENTIALS}" \
      COMPOSE_PROJECT_NAME="debridgers-tunnel" \
      docker compose -f "${TUNNEL_COMPOSE}" up -d --remove-orphans
  fi
fi

echo "==> Skipping database migrations (run against this env's DATABASE_URL before deploy)"

echo "==> Pruning old images"
docker image prune -f

echo "==> Current status"
compose ps

echo "==> Waiting for backend health on :${HOST_PORT}"
deadline=$((SECONDS + 120))
while (( SECONDS < deadline )); do
  if compose ps debridgers-backend 2>/dev/null | grep -q "healthy"; then
    echo "==> Deployment successful: ${DEPLOY_ENV} backend is healthy"
    exit 0
  fi
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
