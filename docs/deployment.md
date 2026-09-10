# Debridgers Deployment Guide

Production-grade deployment of Debridgers backend to Hetzner using Docker, Codeberg Container Registry, and Cloudflare Tunnel for zero-downtime deployments.

## Architecture

```
Internet
    ↓
Cloudflare Tunnel (one tunnel on the VPS)
    ├── api-test.debridgers.com → 127.0.0.1:4002  (dev stack)
    └── api.debridgers.com      → 127.0.0.1:4001  (prod stack)
    ↓
Hetzner VPS (single host)
    ├── /opt/debridgers/dev   → debridgers-backend-dev  (Neon test DB)
    ├── /opt/debridgers/prod  → debridgers-backend-prod (Neon live DB)
    └── debridgers-cloudflared (shared)

Database: two Neon databases (or branches), one per stack. Never share DATABASE_URL.
```

## Prerequisites

- **Hetzner VPS** (Ubuntu 22.04+)
- **Codeberg Account** (https://codeberg.org/DEBRIDGERS_LTD/Debridgers/)
- **Cloudflare Account** with domain configured
- **Cloudflare Tunnel** created (download credentials JSON)
- **Neon PostgreSQL** database provisioned (DATABASE_URL)
- **SSH Key** for VPS deployment access

## Initial VPS Setup (One-Time)

### 1. Bootstrap Server

```bash
# From your local machine:
ssh root@<VPS_IP> 'bash -s' < deploy/bootstrap.sh
```

This installs Docker, creates directories, and configures UFW firewall.

### 2. Create Deployment User

```bash
# SSH to VPS as root
ssh root@<VPS_IP>

# Create deployment user (optional but recommended)
useradd -m -s /bin/bash -G docker debridgers
passwd debridgers
```

Update `SSH_USER` secret in Codeberg to match (e.g., `root` or `debridgers`).

### 3. Copy Configuration Files

```bash
# From your local machine:
scp deploy/docker-compose.prod.yml <SSH_USER>@<VPS_IP>:/opt/debridgers/docker-compose.yml
scp deploy/cloudflared/config.template.yml <SSH_USER>@<VPS_IP>:/opt/debridgers/cloudflared/
```

### 4. Create `.env` files (one per stack)

The API only reads **`DATABASE_URL`**. There is no `PROD_DATABASE_URL` or
`DEV_DATABASE_URL`. Dev and prod each get their own file with a different Neon URL.

Templates (fill secrets with `openssl rand -hex 32`, never commit the filled files):

- `deploy/env.dev.example` → `/opt/debridgers/dev/.env` → Codeberg secret `ENV_FILE_DEV`
- `deploy/env.prod.example` → `/opt/debridgers/prod/.env` → Codeberg secret `ENV_FILE_PROD`

```bash
# On the VPS
mkdir -p /opt/debridgers/dev /opt/debridgers/prod
# Copy filled templates into place (or let CI write them from ENV_FILE_* secrets)
chmod 600 /opt/debridgers/dev/.env /opt/debridgers/prod/.env
```

Do **not** use values like `debridgers_access_secret_change_in_production`. Generate:

```bash
openssl rand -hex 32   # ACCESS_TOKEN_SECRET
openssl rand -hex 32   # REFRESH_TOKEN_SECRET
openssl rand -base64 24  # ADMIN_PASSWORD
```

Use different secrets for dev and prod.

### 5. Install Cloudflare Tunnel Credentials

```bash
# On the VPS:

# Download credentials.json from https://one.dash.cloudflare.com/
# → Networking → Tunnels → Your tunnel → Download credentials

scp ~/Downloads/credentials.json <SSH_USER>@<VPS_IP>:/opt/debridgers/cloudflared/creds.json

# Then on VPS:
chmod 600 /opt/debridgers/cloudflared/creds.json
chown 65532:65532 /opt/debridgers/cloudflared/creds.json
```

## Codeberg Configuration

### Generate Codeberg Personal Access Token

1. Go to https://codeberg.org/user/settings/applications
2. Click "Create new token"
3. Name: `debridgers-ci-cd`
4. Scopes: Select `read:packages`, `write:packages`
5. Save the token (you won't see it again)

### Create Secrets in Codeberg

In `https://codeberg.org/DEBRIDGERS_LTD/Debridgers/settings/secrets`:

#### For Dev Environment (`dev`)

Same `SSH_HOST` / `SSH_USER` / `SSH_PRIVATE_KEY` as production when both stacks share one VPS.

Codeberg/Forgejo usually has repo **Secrets** and **Variables**, not GitHub-style Environments.
Put the two env payloads under **Secrets** (not Variables):

```
ENV_FILE_DEV=<full contents of /opt/debridgers/dev/.env — test Neon DATABASE_URL>
ENV_FILE_PROD=<full contents of /opt/debridgers/prod/.env — live Neon DATABASE_URL>
```

`develop` deploys use `ENV_FILE_DEV`; `main` uses `ENV_FILE_PROD`. You can keep the old `ENV_FILE` secret or delete it once both are set.

### Generate SSH Key for Deployments

```bash
# Generate new key
ssh-keygen -t ed25519 -f deploy_key -C "debridgers-ci" -N ""

# Add public key to VPS
cat deploy_key.pub | ssh <SSH_USER>@<VPS_IP> "cat >> ~/.ssh/authorized_keys"

# Use private key for SSH_PRIVATE_KEY secret
cat deploy_key
# (Save contents to Codeberg secret)
```

## Deployment Process

### Automatic Deployment

Push to branch → Codeberg Actions runs:

1. **Lint, Typecheck, Build** — verify code quality
2. **E2E Tests** — run against PostgreSQL + Redis services
3. **Build Docker Image** — backend image tagged with commit SHA
4. **Push to Registry** — image pushed to `code.codeberg.org/DEBRIDGERS_LTD/debridgers-backend:<sha>`
5. **Deploy to VPS** — via SSH:
   - Copy docker-compose + deploy scripts
   - Install .env (preserves IMAGE_TAG from previous deploy)
   - Install Cloudflare credentials
   - Login to Codeberg Container Registry
   - Run `deploy.sh <sha>` which:
     - Pulls new image
     - Renders Cloudflare tunnel config
     - Starts services via docker-compose
     - **Runs database migrations** (`pnpm db:migrate`)
     - Smoke tests via HTTPS
     - Logs errors and retries on failure

### Manual Deployment

```bash
# SSH to VPS
ssh <SSH_USER>@<VPS_IP>

# Change to app directory
cd /opt/debridgers

# Deploy specific image
./deploy.sh abc1234 prod  # or: ./deploy.sh abc1234 dev
```

## Database Migrations

Migrations run automatically during deployment via `pnpm db:migrate` in the deploy script.

### To manually run migrations on VPS:

```bash
cd /opt/debridgers
docker compose exec -T debridgers-backend pnpm db:migrate
```

### To rollback a migration:

```bash
# SSH to VPS and connect to Neon
docker compose exec -T debridgers-backend psql "$DATABASE_URL" -c "ROLLBACK;"
```

For Neon-specific rollback, use the Neon dashboard: https://console.neon.tech/

## Monitoring & Logs

### View Real-Time Logs

```bash
# On VPS:
cd /opt/debridgers

# Backend logs
docker compose logs -f debridgers-backend

# Cloudflare Tunnel logs
docker compose logs -f cloudflared

# All services
docker compose logs -f
```

### Health Check

```bash
# From anywhere (requires HTTPS)
curl https://api-test.debridgers.com/api/v1/health

# From VPS (localhost)
curl -f http://127.0.0.1:4001/api/v1/health
```

### Container Status

```bash
cd /opt/debridgers
docker compose ps
```

## Rollback

### Automatic Rollback (on deployment failure)

If smoke tests fail, deployment script exits with error and doesn't restart services. Previous .env backup preserved.

### Manual Rollback

```bash
# From your local machine:
./scripts/rollback.sh <dev|prod>

# You'll be prompted to select image tag to rollback to
```

Or manually on VPS:

```bash
cd /opt/debridgers

# List available images
docker image ls | grep debridgers-backend

# Update IMAGE_TAG in .env
sed -i '/^IMAGE_TAG=/d' .env
echo 'IMAGE_TAG=<previous-sha>' >> .env

# Redeploy
./deploy.sh <previous-sha>
```

## Backups & Disaster Recovery

### Database Backups

Neon automatically backs up daily. To restore:

1. Go to https://console.neon.tech/
2. Select project → Branches
3. Click "Restore" and choose backup point
4. Redeploy application

### Manual Database Backup

```bash
# From anywhere with database credentials:
pg_dump "$DATABASE_URL" > debridgers-backup-$(date +%Y%m%d).sql
```

### VPS Backup

Use Hetzner's built-in backup/snapshots:

1. Hetzner Cloud Console → Servers → Your VPS
2. Click "Snapshots" → "Create Snapshot"
3. Use for disaster recovery

## Troubleshooting

| Issue                        | Check                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| "Connection refused on 4001" | `docker compose ps` — is backend running?                  |
| "docker: permission denied"  | `sudo usermod -aG docker $USER`                            |
| "Tunnel not connected"       | `docker compose logs cloudflared` — check creds.json       |
| "Image pull failed"          | `docker login code.codeberg.org`                           |
| "Migration failed"           | `docker compose logs debridgers-backend`                   |
| "Health check timeout"       | Wait 30s; check `curl http://127.0.0.1:4001/api/v1/health` |
| ".env not found"             | Verify `/opt/debridgers/.env` exists and readable          |

### Common Commands on VPS

```bash
cd /opt/debridgers

# Inspect recent logs
docker compose logs --tail 50 debridgers-backend

# Test database connection
docker compose exec -T debridgers-backend \
  node -e "require('pg').Pool.connect('$DATABASE_URL')"

# Check disk space
df -h

# Check Docker resource usage
docker stats

# Restart all services
docker compose restart

# Stop all services (keeps data)
docker compose down
```

## FAQ

**Q: How do I change secrets?**  
A: Update `.env` on VPS, then redeploy: `./deploy.sh latest`

**Q: Can I deploy without pushing to git?**  
A: Yes, manually: `./deploy.sh <image-tag>` on VPS

**Q: How do I scale to multiple VPS?**  
A: Same setup per VPS; add DNS round-robin or Hetzner Load Balancer

**Q: What if Cloudflare Tunnel disconnects?**  
A: It reconnects automatically. Check `docker compose logs cloudflared`

**Q: How do I update deployment scripts?**  
A: Edit `deploy/deploy.sh` and push; CI will copy new version to VPS next deploy
