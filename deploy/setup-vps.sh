#!/usr/bin/env bash
# Configure VPS with secrets and test deployment readiness.
# Usage: ./deploy/setup-vps.sh <ssh-user>@<vps-ip> [path-to-.env]
set -euo pipefail

SSH_TARGET="${1:?Usage: setup-vps.sh <ssh-user>@<vps-ip> [path-to-.env]}"
ENV_FILE="${2:-}"
APP_DIR="/opt/debridgers"

# Auto-detect .env file if not provided
if [ -z "$ENV_FILE" ]; then
  if [ -f "apps/debridgers-backend/.env" ]; then
    ENV_FILE="apps/debridgers-backend/.env"
    echo "Found .env at: $ENV_FILE"
  elif [ -f ".env" ]; then
    ENV_FILE=".env"
    echo "Found .env at: $ENV_FILE"
  fi
fi

echo "==> Connecting to VPS: $SSH_TARGET"
echo "==> App directory: $APP_DIR"
echo ""

# Verify SSH connection works
if ! ssh -o ConnectTimeout=5 "$SSH_TARGET" true 2>/dev/null; then
  echo "ERROR: Cannot connect to $SSH_TARGET" >&2
  exit 1
fi
echo "✓ SSH connection successful"
echo ""

# Step 1: Copy deployment files (if not already present)
echo "==> Checking deployment files on VPS..."

FILES_TO_COPY=(
  "deploy/docker-compose.prod.yml:docker-compose.yml"
  "deploy/deploy.sh:deploy.sh"
  "deploy/cloudflared/config.template.yml:cloudflared/config.template.yml"
)

COPY_NEEDED=0
for file_pair in "${FILES_TO_COPY[@]}"; do
  LOCAL_FILE="${file_pair%%:*}"
  REMOTE_FILE="${file_pair##*:}"
  REMOTE_PATH="$APP_DIR/$REMOTE_FILE"

  if ssh "$SSH_TARGET" test -f "$REMOTE_PATH" 2>/dev/null; then
    echo "  ✓ $REMOTE_FILE (already on VPS)"
  else
    echo "  • $REMOTE_FILE (needs copy)"
    COPY_NEEDED=1
  fi
done

if [ $COPY_NEEDED -eq 1 ]; then
  echo ""
  echo "==> Copying deployment files to VPS..."
  scp deploy/docker-compose.prod.yml "$SSH_TARGET:$APP_DIR/docker-compose.yml"
  scp deploy/deploy.sh "$SSH_TARGET:$APP_DIR/"
  scp deploy/cloudflared/config.template.yml "$SSH_TARGET:$APP_DIR/cloudflared/"
  echo "✓ Files copied"
else
  echo "✓ All deployment files already on VPS"
fi
echo ""

# Step 2: Copy .env file (if not already present or if outdated)
echo "==> Checking .env on VPS..."

ENV_EXISTS=0
if ssh "$SSH_TARGET" test -f "$APP_DIR/.env" 2>/dev/null; then
  echo "  ✓ .env already on VPS"
  ENV_EXISTS=1
fi

if [ "$ENV_EXISTS" -eq 0 ] || [ -n "${FORCE_ENV:-}" ]; then
  echo "==> Installing .env on VPS..."

  if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    # Copy existing .env file
    echo "  Copying from: $ENV_FILE"
    scp "$ENV_FILE" "$SSH_TARGET:$APP_DIR/.env"
    ssh "$SSH_TARGET" chmod 600 "$APP_DIR/.env"
    echo "✓ .env copied and installed (mode 600)"
  else
  # Interactive mode if no .env found
  echo ""
  echo "No .env file found. Enter values interactively:"
  echo ""

  read -p "DATABASE_URL (Neon PostgreSQL): " DATABASE_URL
  read -p "TUNNEL_ID (Cloudflare Tunnel): " TUNNEL_ID
  read -p "APP_URL (e.g., https://api-test.debridgers.com): " APP_URL
  read -p "ADMIN_EMAIL: " ADMIN_EMAIL
  read -sp "ADMIN_PASSWORD: " ADMIN_PASSWORD && echo ""

  # Optional fields
  read -p "CLOUDINARY_CLOUD_NAME (optional): " CLOUDINARY_CLOUD_NAME || true
  read -p "CLOUDINARY_API_KEY (optional): " CLOUDINARY_API_KEY || true
  read -p "CLOUDINARY_API_SECRET (optional): " CLOUDINARY_API_SECRET || true
  read -p "MAILTRAP_TOKEN (optional): " MAILTRAP_TOKEN || true
  read -p "PAYSTACK_SECRET_KEY (optional): " PAYSTACK_SECRET_KEY || true
  read -p "PAYSTACK_PUBLIC_KEY (optional): " PAYSTACK_PUBLIC_KEY || true
  read -p "PAYSTACK_WEBHOOK_SECRET (optional): " PAYSTACK_WEBHOOK_SECRET || true
  read -p "ALLOWED_ORIGINS (optional, comma-separated): " ALLOWED_ORIGINS || true
  read -p "POSTHOG_API_KEY (optional): " POSTHOG_API_KEY || true

  # Generate random secrets
  ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
  REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
  REQUEST_KEY=$(openssl rand -base64 32 | tr -d '\n')
  ADMIN_KEY_1=$(openssl rand -base64 32 | tr -d '\n')
  ADMIN_KEY_2=$(openssl rand -base64 32 | tr -d '\n')
  PAYMENT_KEY_1=$(openssl rand -base64 32 | tr -d '\n')
  PAYMENT_KEY_2=$(openssl rand -base64 32 | tr -d '\n')

  echo ""
  echo "✓ Generated random secrets"
  echo ""

  # Create .env file via SSH
  ssh "$SSH_TARGET" cat > "$APP_DIR/.env" <<ENV_FILE
# Database
DATABASE_URL="$DATABASE_URL"

# Cloudflare Tunnel
TUNNEL_ID="$TUNNEL_ID"

# Application
NODE_ENV=production
PORT=4001
APP_URL="$APP_URL"

# Auth Tokens (auto-generated)
ACCESS_TOKEN_SECRET="$ACCESS_TOKEN_SECRET"
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET="$REFRESH_TOKEN_SECRET"
REFRESH_TOKEN_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-}"
CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-}"
CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-}"

# Mailtrap
MAILTRAP_TOKEN="${MAILTRAP_TOKEN:-}"
MAILTRAP_FROM_EMAIL="noreply@debridgers.com"
MAILTRAP_FROM_NAME="Debridgers"

# Paystack
PAYSTACK_SECRET_KEY="${PAYSTACK_SECRET_KEY:-}"
PAYSTACK_PUBLIC_KEY="${PAYSTACK_PUBLIC_KEY:-}"
PAYSTACK_WEBHOOK_SECRET="${PAYSTACK_WEBHOOK_SECRET:-}"
PAYSTACK_PREFERRED_BANK=""

# CORS
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-$APP_URL}"

# Admin Seed
ADMIN_EMAIL="$ADMIN_EMAIL"
ADMIN_PASSWORD="$ADMIN_PASSWORD"

# Security Keys (auto-generated)
REQUEST_KEY="$REQUEST_KEY"
ADMIN_KEY_1="$ADMIN_KEY_1"
ADMIN_KEY_2="$ADMIN_KEY_2"
PAYMENT_KEY_1="$PAYMENT_KEY_1"
PAYMENT_KEY_2="$PAYMENT_KEY_2"

# Analytics
POSTHOG_API_KEY="${POSTHOG_API_KEY:-}"
POSTHOG_HOST="https://us.i.posthog.com"

# Image Tag (set by CI/CD)
IMAGE_TAG=""
ENV_FILE

    ssh "$SSH_TARGET" chmod 600 "$APP_DIR/.env"
    echo "✓ .env created and installed (mode 600)"
  fi
else
  echo "  (skipping .env copy — already exists on VPS)"
  echo "  To force update, run: FORCE_ENV=1 ./deploy/setup-vps.sh $SSH_TARGET"
fi

echo ""

# Step 3: Cloudflare credentials
echo "==> Checking Cloudflare Tunnel credentials..."

CREDS_EXISTS=0
if ssh "$SSH_TARGET" test -f "$APP_DIR/cloudflared/creds.json" 2>/dev/null; then
  echo "  ✓ Credentials already on VPS"
  CREDS_EXISTS=1
fi

if [ "$CREDS_EXISTS" -eq 0 ] || [ -n "${FORCE_CREDS:-}" ]; then
  echo "==> Installing Cloudflare Tunnel credentials..."

  CREDS_FILE=""
  # Auto-detect credentials.json
  if [ -f "credentials.json" ]; then
    CREDS_FILE="credentials.json"
  elif [ -f "deploy/credentials.json" ]; then
    CREDS_FILE="deploy/credentials.json"
  fi

  if [ -z "$CREDS_FILE" ]; then
    echo "  No credentials.json found locally"
    read -p "  Path to credentials.json file: " CREDS_FILE_INPUT
    CREDS_FILE="${CREDS_FILE_INPUT:-}"
  fi

  if [ -n "$CREDS_FILE" ] && [ -f "$CREDS_FILE" ]; then
    echo "  Copying from: $CREDS_FILE"
    scp "$CREDS_FILE" "$SSH_TARGET:$APP_DIR/cloudflared/creds.json"
    ssh "$SSH_TARGET" "chmod 600 $APP_DIR/cloudflared/creds.json && sudo chown 65532:65532 $APP_DIR/cloudflared/creds.json 2>/dev/null || true"
    echo "✓ Credentials installed"
  else
    echo "  ⚠ No credentials.json provided (can be added later)"
  fi
else
  echo "  (skipping credentials copy — already exists on VPS)"
  echo "  To force update, run: FORCE_CREDS=1 ./deploy/setup-vps.sh $SSH_TARGET"
fi
echo ""

# Step 4: Test Docker configuration
echo "==> Testing Docker configuration..."
ssh "$SSH_TARGET" "cd $APP_DIR && docker compose config > /dev/null" && echo "✓ docker-compose.yml is valid" || {
  echo "ERROR: docker-compose.yml validation failed" >&2
  exit 1
}

# Step 5: Verify all pieces
echo ""
echo "==> Verification checklist:"
ssh "$SSH_TARGET" bash <<'VERIFY_SCRIPT'
APP_DIR="/opt/debridgers"

echo ""
echo "Directory structure:"
ls -lh "$APP_DIR" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "Required files:"
for f in ".env" "docker-compose.yml" "deploy.sh" "cloudflared/creds.json" "cloudflared/config.template.yml"; do
  if [ -f "$APP_DIR/$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f (MISSING)"
  fi
done

echo ""
echo "Permissions:"
stat -c "  .env: %a (%U:%G)" "$APP_DIR/.env"
stat -c "  creds.json: %a (%U:%G)" "$APP_DIR/cloudflared/creds.json"

echo ""
echo "Docker status:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  (no containers running yet)"

echo ""
echo "Network status:"
ping -c 1 8.8.8.8 > /dev/null && echo "  ✓ Internet connectivity OK" || echo "  ✗ No internet"

VERIFY_SCRIPT

echo ""
echo "==> VPS Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Run: ./deploy/setup-codeberg.sh <vps-ip>"
echo "     This generates SSH keys and guides you to create Codeberg secrets"
echo ""
echo "  2. After secrets are configured in Codeberg, push code:"
echo "     git push origin develop"
echo ""
echo "  3. Watch deployment at: https://codeberg.org/DEBRIDGERS_LTD/Debridgers/actions"
echo ""
