#!/usr/bin/env bash
# Direct Node.js deployment script (runs on VPS via SSH)
set -euo pipefail

APP_DIR="/opt/debridgers"
CURRENT_DIR="${APP_DIR}/current"
BACKUP_DIR="${APP_DIR}/backups"
ENV="${1:?Usage: deploy.sh <dev|production> <build-id>}"
BUILD_ID="${2:?Usage: deploy.sh <dev|production> <build-id>}"

cd "${APP_DIR}"

echo "==> Deploying Debridgers backend: ${ENV} (${BUILD_ID})"

# Create backup of current deployment
if [ -d "${CURRENT_DIR}" ]; then
  mkdir -p "${BACKUP_DIR}"
  BACKUP_TS=$(date +%s)
  cp -a "${CURRENT_DIR}" "${BACKUP_DIR}/app-${BACKUP_TS}"
  echo "✓ Backed up previous deployment to ${BACKUP_DIR}/app-${BACKUP_TS}"
fi

# Extract deployment package
echo "==> Extracting deployment package"
mkdir -p "${CURRENT_DIR}"
tar -xzf "/tmp/debridgers-backend-${BUILD_ID}.tar.gz" -C "${CURRENT_DIR}"
echo "✓ Extracted to ${CURRENT_DIR}"

# Load environment
set -a
source .env
set +a

# Ensure DATABASE_URL is set
: "${DATABASE_URL:?DATABASE_URL must be set in ${APP_DIR}/.env}"

# Install dependencies (pnpm is already installed globally via bootstrap)
echo "==> Installing dependencies"
cd "${CURRENT_DIR}"
pnpm install --frozen-lockfile --prod
echo "✓ Dependencies installed"

# Run migrations
echo "==> Running database migrations"
export DATABASE_URL
pnpm db:migrate
echo "✓ Migrations complete"

# Stop old PM2 process
echo "==> Stopping old PM2 process"
pm2 stop debridgers-backend 2>/dev/null || true
echo "✓ PM2 process stopped"

# Create PM2 ecosystem config
echo "==> Creating PM2 config"
cat > "${APP_DIR}/ecosystem.config.js" <<'EOF'
module.exports = {
  apps: [{
    name: 'debridgers-backend',
    script: './dist/main.js',
    cwd: '/opt/debridgers/current',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    error_file: '/opt/debridgers/logs/error.log',
    out_file: '/opt/debridgers/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    watch: false,
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
echo "✓ PM2 config created"

# Start/restart with PM2
echo "==> Starting Node app with PM2"
cd /opt/debridgers
pm2 start ecosystem.config.js --env production
pm2 save
echo "✓ PM2 process started"

# Wait for app to be ready
echo "==> Waiting for app to be ready"
sleep 3

# Health check via Cloudflare Tunnel
HEALTH_URL="${APP_URL:-http://localhost:4001}/api/v1/health"
echo "==> Health check: ${HEALTH_URL}"

for attempt in $(seq 1 12); do
  if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
    echo "✓ Health check passed"
    break
  fi
  if [ $attempt -eq 12 ]; then
    echo "✗ Health check failed after 12 attempts" >&2
    echo "==> Recent PM2 logs:" >&2
    pm2 logs debridgers-backend --lines 20 --nostream || true
    exit 1
  fi
  echo "  attempt ${attempt}/12: retrying in 5s..."
  sleep 5
done

echo ""
echo "==> Deployment complete!"
echo "==> Current app status:"
pm2 status
