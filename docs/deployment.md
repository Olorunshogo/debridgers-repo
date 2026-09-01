# Debridgers Deployment

Two Hetzner VPS: `dev` and `production`. GitHub Actions builds backend + frontend images to GHCR, then SSHes in to pull and restart via docker-compose. **Cloudflare Tunnel** handles HTTPS routing — no inbound ports, no nginx, no SSL cert management needed.

## One-time VPS setup

```bash
ssh root@<vps-ip> 'bash -s' < deploy/bootstrap.sh
```

Then on the VPS:

1. Update `/opt/debridgers/.env` with production secrets:

   ```bash
   DATABASE_URL=postgresql://neondb_owner:npg_fecZxW5pVq1H@...
   NODE_ENV=production
   ALLOWED_ORIGINS=https://api-test.debridgers.com

   # Auth & API Keys
   ACCESS_TOKEN_SECRET=your-secret
   REFRESH_TOKEN_SECRET=your-secret
   REQUEST_KEY=your-secret
   ADMIN_KEY_1=your-secret
   ADMIN_KEY_2=your-secret
   PAYMENT_KEY_1=your-secret
   PAYMENT_KEY_2=your-secret

   # Paystack
   PAYSTACK_SECRET_KEY=your-secret

   # Admin
   ADMIN_EMAIL=admin@debridgers.com
   ADMIN_PASSWORD=your-password

   # Tunnel (from Cloudflare)
   TUNNEL_ID=9cd65402-a46e-46bb-9ce9-be6c7d741835

   # Image tag (managed by CI/CD, do not edit)
   IMAGE_TAG=latest
   ```

2. **Install Cloudflare tunnel credentials:**
   - Go to https://one.dash.cloudflare.com/
   - Networking → Tunnels → Your tunnel → click the down arrow → Download credentials file
   - Save as `/opt/debridgers/cloudflared/creds.json` on the VPS
   - `chmod 600 creds.json && chown 65532:65532 creds.json`

3. **Verify tunnel connectivity** (optional):
   ```bash
   cd /opt/debridgers
   docker run -v ./cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel --config /etc/cloudflared/config.template.yml run
   ```

## GitHub configuration

Create two GitHub Environments — `dev` (used for pushes to `develop`) and `production` (used for pushes to `main`) — each with these secrets:

- `SSH_HOST` — the VPS IP
- `SSH_USER` — the SSH user (e.g. `root`)
- `SSH_PRIVATE_KEY` — private key matching a public key in that VPS's `~/.ssh/authorized_keys`
- `ENV_FILE` — the complete `.env` file contents (all secrets, multiline). **MUST include TUNNEL_ID**
- `GHCR_PAT` — a classic GitHub Personal Access Token with `read:packages` scope
- `CLOUDFLARE_TUNNEL_CREDENTIALS` — the Cloudflare tunnel credentials JSON (multiline)

### Creating GHCR_PAT

1. Go to GitHub Settings → Developer settings → Personal access tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `debridgers-deploy-ghcr`
4. Scopes: Check `read:packages` only
5. Generate and save the token
6. Add to both `dev` and `production` environments as `GHCR_PAT`

### Getting Cloudflare Credentials

1. Go to https://one.dash.cloudflare.com/
2. Networking → Tunnels → Click your tunnel
3. Click the download arrow → "Download credentials"
4. Copy the JSON file contents
5. Add to `dev` and `production` environments as `CLOUDFLARE_TUNNEL_CREDENTIALS` (paste entire file as multiline secret)

## How a deploy works

`.github/workflows/deploy.yml`:

1. Builds backend + frontend from `docker/` and pushes to GHCR tagged with:
   - Short commit SHA (e.g. `a1b2c3d`)
   - Floating tag: `develop` or `latest` (depending on branch)

2. Copies `deploy/docker-compose.prod.yml`, `deploy/deploy.sh`, and `deploy/cloudflared/config.template.yml` to `/opt/debridgers` on the target VPS

3. Installs tunnel credentials at `/opt/debridgers/cloudflared/creds.json`

4. Runs `deploy.sh <sha>` on the VPS, which:
   - Persists `IMAGE_TAG=<sha>` in `.env`
   - Renders `/opt/debridgers/cloudflared/config.yml` from the template with TUNNEL_ID from .env
   - Pulls latest images
   - Runs `docker compose up -d --remove-orphans`
   - Force-recreates cloudflared container (tunnel reads config at startup)
   - Smoke tests via `https://api-test.debridgers.com/api/v1/health`

The rest of `.env` (secrets, DATABASE_URL, TUNNEL_ID) is never touched by CI — update it by hand on the VPS when secrets change.

## Cloudflare Tunnel Setup (One-time)

1. Go to https://one.dash.cloudflare.com/
2. Networking → Tunnels → Create a tunnel
3. Name: `debridgers-dev` (or `debridgers-prod`)
4. Choose: Docker
5. Save the TUNNEL_ID and download the credentials
6. Create route:
   - **Hostname:** `api-test.debridgers.com` (or your domain)
   - **Service type:** HTTP
   - **Service URL:** `localhost:4001`
7. Save

Then add the TUNNEL_ID and credentials to GitHub secrets (see "GitHub configuration" above).

## Rolling back

```bash
ssh root@<host>
cd /opt/debridgers
IMAGE_TAG=<previous-sha> docker compose up -d
```

The previous IMAGE_TAG is preserved in `.env.bak.*` backups (6 most recent kept).

## Troubleshooting

**Check deployment logs:**

```bash
ssh root@<host>
cd /opt/debridgers
docker compose logs -f debridgers-backend
docker compose logs -f cloudflared
```

**Verify tunnel is connected:**

```bash
docker compose ps cloudflared
docker compose logs cloudflared
```

**Verify tunnel routes in Cloudflare dashboard:**

- Go to https://one.dash.cloudflare.com/
- Networking → Tunnels → Click your tunnel
- Check "Routes" tab

**Test health check directly from VPS:**

```bash
curl http://localhost:4001/api/v1/health
```

**Verify GHCR login:**

```bash
docker login ghcr.io -u <username>
docker pull ghcr.io/<org>/<repo>/debridgers-backend:latest
```
