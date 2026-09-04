#!/usr/bin/env bash
# Generate SSH keys and guide Codeberg secret configuration.
# Run from local machine: ./deploy/setup-codeberg.sh <vps-ip>
set -euo pipefail

VPS_IP="${1:?Usage: setup-codeberg.sh <vps-ip>}"
DEPLOY_USER="${2:-debridgers_dev1}"  # Optional: override default user
KEYS_DIR="$HOME/.ssh/debridgers"
PRIVATE_KEY="$KEYS_DIR/id_ed25519"
PUBLIC_KEY="$KEYS_DIR/id_ed25519.pub"

echo "==> Setting up SSH keys for CI/CD deployments"
echo "    VPS IP: $VPS_IP"
echo "    Deploy User: $DEPLOY_USER"
echo ""

# Step 1: Generate SSH key
echo "==> Generating SSH key pair..."
mkdir -p "$KEYS_DIR"

if [ -f "$PRIVATE_KEY" ]; then
  echo "    Key already exists at $PRIVATE_KEY"
  read -p "    Overwrite? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "    Using existing key"
  else
    rm -f "$PRIVATE_KEY" "$PUBLIC_KEY"
    ssh-keygen -t ed25519 -f "$PRIVATE_KEY" -C "debridgers-ci@$VPS_IP" -N ""
    echo "    ✓ New key generated"
  fi
else
  ssh-keygen -t ed25519 -f "$PRIVATE_KEY" -C "debridgers-ci@$VPS_IP" -N ""
  echo "    ✓ Key generated"
fi

chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"
echo ""

# Step 2: Add public key to VPS
echo "==> Adding public key to VPS authorized_keys..."
PUB_KEY_CONTENT=$(cat "$PUBLIC_KEY")

ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$VPS_IP" bash <<SSH_SETUP
  mkdir -p ~/.ssh
  echo "$PUB_KEY_CONTENT" >> ~/.ssh/authorized_keys
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  echo "✓ Public key installed on VPS"
SSH_SETUP

echo ""

# Step 3: Test SSH connection with new key
echo "==> Testing SSH connection with new key..."
if ssh -i "$PRIVATE_KEY" -o ConnectTimeout=5 "$DEPLOY_USER@$VPS_IP" true 2>/dev/null; then
  echo "    ✓ SSH key authentication works"
else
  echo "    ✗ SSH key authentication failed" >&2
  exit 1
fi
echo ""

# Step 4: Display secrets needed for Codeberg
echo "==> Generating values for Codeberg secrets..."
PRIVATE_KEY_CONTENT=$(cat "$PRIVATE_KEY")

cat <<'EOF'

╔════════════════════════════════════════════════════════════════╗
║        CODEBERG SECRETS CONFIGURATION                          ║
╚════════════════════════════════════════════════════════════════╝

Go to: https://codeberg.org/DEBRIDGERS_LTD/Debridgers/settings/secrets

1. Create NEW environment for DEV (if not exists)
   Name: "dev"

   Add these secrets:

   SECRET: SSH_HOST
   VALUE:
EOF

echo "   $VPS_IP"

cat <<'EOF'

   SECRET: SSH_USER
   VALUE:
EOF

echo "   $DEPLOY_USER"

cat <<'EOF'

   SECRET: SSH_PRIVATE_KEY
   VALUE (paste entire content):
EOF

echo "   [BELOW - copy everything between lines]"
echo "   ═══════════════════════════════════════"
cat "$PRIVATE_KEY"
echo "   ═══════════════════════════════════════"

cat <<'EOF'

2. Create GLOBAL secrets (available to all environments)

   Go to: Settings → Secrets & variables → Actions

   SECRET: CODEBERG_TOKEN
   VALUE: [Your Codeberg Personal Access Token]

   To generate:
   - Go to https://codeberg.org/user/settings/applications
   - Click "Create new token"
   - Name: "debridgers-ci-cd"
   - Scopes: read:packages, write:packages
   - Save token (won't see it again!)

   SECRET: ENV_FILE
   VALUE: [Entire .env file from VPS]

   To get .env from VPS:
   - ssh debridgers_dev1@{VPS_IP}
   - cat /opt/debridgers/.env
   - Copy entire output and paste as secret

   SECRET: CLOUDFLARE_TUNNEL_CREDENTIALS
   VALUE: [Entire credentials.json from Cloudflare]

   To get credentials.json:
   - Go to https://one.dash.cloudflare.com/
   - Networking → Tunnels → Your Tunnel
   - Download credentials.json
   - Copy entire JSON content and paste as secret

3. For PRODUCTION environment:

   Create environment "production" with same SSH secrets:
   - SSH_HOST (prod VPS IP)
   - SSH_USER (prod deployment user)
   - SSH_PRIVATE_KEY (prod SSH key - generate new or reuse)

EOF

echo ""
echo "==> After adding all secrets to Codeberg..."
echo ""
echo "Test deployment:"
echo "  1. git push origin develop"
echo "  2. Watch: https://codeberg.org/DEBRIDGERS_LTD/Debridgers/actions"
echo ""
echo "If workflow succeeds:"
echo "  ✓ SSH key works"
echo "  ✓ Codeberg registry auth works"
echo "  ✓ Image builds and pushes"
echo "  ✓ VPS deployment completes"
echo "  ✓ Migrations run"
echo "  ✓ Smoke tests pass"
echo ""
