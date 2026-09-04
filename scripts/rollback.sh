#!/usr/bin/env bash
# Rollback to the previous Docker image tag.
# Usage: ./scripts/rollback.sh [dev|prod]
set -euo pipefail

ENVIRONMENT="${1:?Usage: rollback.sh <dev|prod>}"
APP_DIR="/opt/debridgers"

case "$ENVIRONMENT" in
  dev)
    SSH_HOST="${SSH_HOST_DEV:?SSH_HOST_DEV not set}"
    SSH_USER="${SSH_USER_DEV:?SSH_USER_DEV not set}"
    ;;
  prod)
    SSH_HOST="${SSH_HOST_PROD:?SSH_HOST_PROD not set}"
    SSH_USER="${SSH_USER_PROD:?SSH_USER_PROD not set}"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT (must be dev or prod)" >&2
    exit 1
    ;;
esac

echo "==> Connecting to ${ENVIRONMENT} VPS (${SSH_USER}@${SSH_HOST})"
echo "==> Reading current IMAGE_TAG"
CURRENT_TAG=$(ssh "$SSH_USER@$SSH_HOST" "grep '^IMAGE_TAG=' ${APP_DIR}/.env" | cut -d= -f2)
echo "    Current: ${CURRENT_TAG}"

echo "==> Fetching available image tags"
IMAGES=$(ssh "$SSH_USER@$SSH_HOST" "docker compose -f ${APP_DIR}/docker-compose.yml images --quiet debridgers-backend || true" | sort -r | head -5)
if [ -z "$IMAGES" ]; then
  echo "No images found. Try 'docker image ls' on the server." >&2
  exit 1
fi

echo "==> Available images (5 most recent):"
ssh "$SSH_USER@$SSH_HOST" "docker image ls | grep debridgers-backend | head -5"

echo ""
echo "Current image tag: ${CURRENT_TAG}"
read -p "Enter image tag to rollback to (or Ctrl+C to cancel): " ROLLBACK_TAG

if [ -z "$ROLLBACK_TAG" ]; then
  echo "Rollback cancelled." >&2
  exit 1
fi

echo ""
echo "==> Backing up current .env"
ssh "$SSH_USER@$SSH_HOST" "
  cd ${APP_DIR}
  cp -a .env \".env.rollback.$(date +%s)\"
"

echo "==> Updating IMAGE_TAG in .env to ${ROLLBACK_TAG}"
ssh "$SSH_USER@$SSH_HOST" "
  cd ${APP_DIR}
  sed -i '/^IMAGE_TAG=/d' .env
  echo 'IMAGE_TAG=${ROLLBACK_TAG}' >> .env
"

echo "==> Running deploy script with rollback image"
ssh "$SSH_USER@$SSH_HOST" "
  chmod +x ${APP_DIR}/deploy.sh
  ${APP_DIR}/deploy.sh ${ROLLBACK_TAG}
"

echo "==> Rollback complete!"
echo "If this rollback failed, restore from .env backups:"
echo "    ssh $SSH_USER@$SSH_HOST 'ls -lt ${APP_DIR}/.env.bak.* | head'"
