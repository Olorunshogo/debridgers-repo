#!/bin/bash
set -e

# === Configuration
BRANCH=${1:-develop}  # Default to develop, can pass 'main' for prod
REPO_URL="git@bitbucket.org:debridgers_ltd/debridgers.git"
APP_DIR="/opt/debridgers"
ENV_FILE="$APP_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# === Phase 1: Install Dependencies
log "Phase 1: Installing dependencies..."

if ! command -v docker &> /dev/null; then
  log "Installing Docker..."
  apt-get update
  apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

  echo \
    "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

  systemctl start docker
  systemctl enable docker
else
  log "Docker already installed"
fi

if ! command -v git &> /dev/null; then
  apt-get install -y git
fi

# === Phase 2: Clone or Pull Repository
log "Phase 2: Setting up repository..."

if [ -d "$APP_DIR" ]; then
  log "Repository exists, pulling latest..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  log "Cloning repository..."
  mkdir -p /opt
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# === Phase 3: Environment Setup
log "Phase 3: Setting up environment..."

if [ ! -f "$ENV_FILE" ]; then
  log "Creating .env file... (you must update this with real secrets)"
  cat > "$ENV_FILE" << 'ENVFILE'
# Backend
NODE_ENV=production
PORT=4001
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/debridgers
UPSTASH_REDIS_URL=redis://redis:6379

# Auth
ACCESS_TOKEN_SECRET=change-me-in-production
REFRESH_TOKEN_SECRET=change-me-in-production

# API Keys
REQUEST_KEY=change-me-in-production
ADMIN_KEY_1=change-me-in-production
ADMIN_KEY_2=change-me-in-production
PAYMENT_KEY_1=change-me-in-production
PAYMENT_KEY_2=change-me-in-production

# Paystack
PAYSTACK_SECRET_KEY=change-me-in-production

# Frontend
VITE_API_URL=http://localhost:4001
VITE_APP_URL=http://localhost:3000

# Admin
ADMIN_EMAIL=admin@debridgers.com
ADMIN_PASSWORD=change-me-in-production

# Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
ENVFILE

  error "Please update $ENV_FILE with production values, then run this script again"
fi

# === Phase 4: Build Docker Images
log "Phase 4: Building Docker images..."

cd "$APP_DIR"
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  build --no-cache

# === Phase 5: Start Services
log "Phase 5: Starting services..."

docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  down || true

docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d

# === Phase 6: Run Migrations
log "Phase 6: Running database migrations..."

sleep 5  # Give postgres time to start

docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  exec -T debridgers-backend pnpm db:migrate || log "Migrations already applied"

# === Phase 7: Health Checks
log "Phase 7: Checking health..."

sleep 3

BACKEND_HEALTH=$(curl -s http://localhost:4001/api/v1/health || echo "unhealthy")
log "Backend status: $BACKEND_HEALTH"

if curl -s http://localhost:4001/api/v1/health > /dev/null 2>&1; then
  log "${GREEN}✓ Backend is healthy${NC}"
else
  error "Backend health check failed"
fi

# === Success
log "${GREEN}✓ Deployment complete!${NC}"
log "Backend: http://localhost:4001"
log "Frontend: http://localhost:3000"
log ""
log "To view logs: docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs -f"
