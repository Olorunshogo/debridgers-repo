#!/usr/bin/env bash

# === Stood down
# Deployment is deferred. This script is intentionally inert. The body below is
# kept intact and reviewed, so re-enabling is deleting these five lines.
echo "deploy/deploy.sh is stood down. Delete the guard at the top of the file to re-enable." >&2
exit 1

set -euo pipefail

# Deploys the Debridgers API on the host. Invoked over SSH by
# .github/workflows/deploy-backend.yml, and safe to run by hand.
#
# Required in the environment:
#   IMAGE_TAG        image tag to run, normally the short commit SHA
#   GHCR_OWNER       GitHub owner that owns the package
# Optional:
#   DEPLOY_ENV_B64   base64 of the application .env, from the CI secret
#   GHCR_USER        GHCR username, when the package is private
#   GHCR_TOKEN       GHCR token, when the package is private
#   APP_DIR          defaults to /opt/debridgers

APP_DIR="${APP_DIR:-/opt/debridgers}"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
ENV_FILE="${APP_DIR}/.env"
BACKUP_DIR="${APP_DIR}/env-backups"
CRED_FILE="${APP_DIR}/cloudflared/credentials.json"
BACKUPS_KEPT=5

# Preserved from the host .env on every deploy rather than carried in the CI
# secret: they describe this machine and its tunnel, not the application. A
# secret that forgot one of them used to blank it and take the tunnel down.
HOST_MANAGED_KEYS=(TUNNEL_ID API_HOSTNAME IMAGE_TAG GHCR_OWNER)

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${GHCR_OWNER:?GHCR_OWNER is required}"

compose() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

log() {
  echo "==> $*"
}

# === Environment file
# Writing the env file is the one step that can destroy state the host owns, so
# it refuses more than it acts.
update_env_file() {
  if [[ -z "${DEPLOY_ENV_B64:-}" ]]; then
    log "No DEPLOY_ENV_B64 supplied, leaving ${ENV_FILE} untouched"
    [[ -f "${ENV_FILE}" ]] || {
      echo "No ${ENV_FILE} on the host and none supplied. Refusing to deploy." >&2
      exit 1
    }
    return
  fi

  local incoming
  incoming="$(mktemp)"
  trap 'rm -f "${incoming}"' RETURN

  printf '%s' "${DEPLOY_ENV_B64}" | base64 -d >"${incoming}"

  # An empty secret is almost always a misconfigured repository secret rather
  # than an intention to run with no configuration. Overwriting on that reading
  # once cost an evening of "why is nothing set".
  if ! grep -q '[^[:space:]]' "${incoming}"; then
    echo "DEPLOY_ENV_B64 decoded to nothing. Refusing to overwrite ${ENV_FILE}." >&2
    exit 1
  fi

  mkdir -p "${BACKUP_DIR}"
  chmod 700 "${BACKUP_DIR}"

  if [[ -f "${ENV_FILE}" ]]; then
    cp -p "${ENV_FILE}" "${BACKUP_DIR}/.env.$(date -u +%Y%m%d%H%M%S)"
    # Keep the last few. Unbounded backups of a secrets file are their own risk.
    # shellcheck disable=SC2012
    ls -1t "${BACKUP_DIR}"/.env.* 2>/dev/null \
      | tail -n "+$((BACKUPS_KEPT + 1))" \
      | while IFS= read -r stale; do rm -f "${stale}"; done
  fi

  local merged
  merged="$(mktemp)"

  {
    echo "# Host-managed keys. Preserved across deploys, never taken from the CI secret."
    for key in "${HOST_MANAGED_KEYS[@]}"; do
      local existing=""
      if [[ -f "${ENV_FILE}" ]]; then
        existing="$(sed -n "s/^${key}=//p" "${ENV_FILE}" | tail -n 1)"
      fi
      case "${key}" in
        # These two are the deploy's own inputs, so the incoming value wins over
        # what the last deploy left behind.
        IMAGE_TAG) existing="${IMAGE_TAG}" ;;
        GHCR_OWNER) existing="${GHCR_OWNER}" ;;
      esac
      echo "${key}=${existing}"
    done
    echo
    echo "# Application configuration, replaced from the CI secret on each deploy."
    # Host-managed keys are stripped from the incoming file so a stray copy in
    # the secret cannot shadow the host's own value.
    grep -Ev "^[[:space:]]*($(IFS='|'; echo "${HOST_MANAGED_KEYS[*]}"))=" "${incoming}" || true
  } >"${merged}"

  install -m 600 "${merged}" "${ENV_FILE}"
  rm -f "${merged}"
  log "Wrote ${ENV_FILE} (backup in ${BACKUP_DIR})"
}

read_env() {
  sed -n "s/^${1}=//p" "${ENV_FILE}" | tail -n 1
}

# === Cloudflare ingress
render_ingress() {
  local tunnel_id hostname template out
  tunnel_id="$(read_env TUNNEL_ID)"
  hostname="$(read_env API_HOSTNAME)"
  template="${APP_DIR}/cloudflared/config.template.yml"
  out="${APP_DIR}/cloudflared/config.yml"

  [[ -n "${tunnel_id}" ]] || { echo "TUNNEL_ID is empty in ${ENV_FILE}" >&2; exit 1; }
  [[ -n "${hostname}" ]] || { echo "API_HOSTNAME is empty in ${ENV_FILE}" >&2; exit 1; }
  [[ -f "${template}" ]] || { echo "Missing ${template}" >&2; exit 1; }

  sed -e "s|\${TUNNEL_ID}|${tunnel_id}|g" \
      -e "s|\${API_HOSTNAME}|${hostname}|g" \
      "${template}" >"${out}"
  log "Rendered ingress for ${hostname}"
}

# === Tunnel credentials
# The cloudflared image runs as uid 65532 and cannot read a root-owned file. The
# symptom is a container that restarts quietly while the API looks fine from
# inside the host.
#
# Done through a container because the deploy user is in the docker group but is
# not root, so it cannot chown to another uid directly.
fix_credentials_ownership() {
  [[ -f "${CRED_FILE}" ]] || {
    echo "Missing ${CRED_FILE}. Copy the tunnel credentials there once, by hand." >&2
    exit 1
  }
  docker run --rm --user 0:0 \
    -v "${APP_DIR}/cloudflared:/mnt" \
    alpine:3 sh -c 'chown 65532:65532 /mnt/credentials.json && chmod 600 /mnt/credentials.json'
  log "Tunnel credentials owned by 65532:65532, mode 600"
}

# === Smoke test
# Through the public hostname, never localhost. A backend that answers on the
# compose network while the tunnel is down looks perfectly healthy from here,
# which is exactly the outage this test exists to catch.
smoke_test() {
  local hostname url attempt delay
  hostname="$(read_env API_HOSTNAME)"
  url="https://${hostname}/api/v1/health"
  delay=3

  for attempt in $(seq 1 10); do
    if curl -fsS --max-time 10 "${url}" >/dev/null 2>&1; then
      log "Smoke test passed on attempt ${attempt}: ${url}"
      return 0
    fi
    log "Smoke test attempt ${attempt} failed, retrying in ${delay}s"
    sleep "${delay}"
    delay=$((delay + 3))
  done

  echo "Smoke test never passed against ${url}" >&2
  echo "--- backend logs ---" >&2
  compose logs --tail=200 backend >&2 || true
  echo "--- cloudflared logs ---" >&2
  compose logs --tail=200 cloudflared >&2 || true
  echo "--- container state ---" >&2
  compose ps >&2 || true
  return 1
}

# === Run
log "Deploying ${GHCR_OWNER}/debridgers/debridgers-backend:${IMAGE_TAG} to ${APP_DIR}"

update_env_file
render_ingress
fix_credentials_ownership

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s' "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-x}" --password-stdin
fi

log "Pulling images"
compose pull

# Migrations run before the new code starts, from the image being deployed, so
# the SQL always matches the binary that is about to serve it. No entrypoint is
# set on the image, so these arguments simply replace the default command.
log "Running migrations"
compose run --rm backend drizzle-kit migrate

log "Starting services"
compose up -d --remove-orphans

# cloudflared reads its ingress once, at start. Without this, an ingress change
# takes effect at the next unrelated restart and nobody connects the two.
log "Recreating cloudflared so it re-reads ingress"
compose up -d --force-recreate cloudflared

smoke_test

docker image prune -f >/dev/null 2>&1 || true
log "Deploy complete"
