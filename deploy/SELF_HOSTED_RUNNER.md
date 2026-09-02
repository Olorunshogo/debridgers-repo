# Self-Hosted Forgejo Runner Setup

## Why Self-Hosted?

Codeberg's public runners are limited (no Docker daemon). The self-hosted runner gives us:

- ✅ Full Docker support for building images
- ✅ Lightweight tasks stay on fast Codeberg runners
- ✅ Docker builds run on your VPS where Docker exists

## Setup

### 1. Get Runner Token from Codeberg

1. Go to your repo on Codeberg
2. **Settings** → **Actions** → **Runners**
3. Click **"Create new runner"**
4. **Copy the token** (valid for ~1 hour)

### 2. SSH to VPS and Start Runner

```bash
ssh debridgers_dev1@<VPS_IP>
cd /opt/debridgers

# Set the token
export FORGEJO_RUNNER_TOKEN="<paste-token-here>"

# Start the runner
docker-compose -f runner-compose.yml up -d

# Verify it's running and registered
docker-compose -f runner-compose.yml logs -f
```

You should see:

```
forgejo-runner | Connected to Codeberg instance
forgejo-runner | Registered runner
```

### 3. Verify in Codeberg

Go back to **Settings** → **Actions** → **Runners**

Your runner should appear with status **Active** (green dot)

## How It Works

When you push code:

1. **Codeberg runners** handle lightweight tasks:
   - `lint` job (linting, typecheck)
   - `build` job (build all packages)
   - `test` job (run tests)
   - `deploy-dev` / `deploy-production` (SSH deployment)

2. **Self-hosted runner** (your VPS) handles heavy work:
   - `build-and-push` job (Docker build, push to registry)
   - Has full Docker daemon access
   - Runs on the machine where your app will run

## Stopping/Restarting

```bash
# Stop
docker-compose -f runner-compose.yml down

# Restart
docker-compose -f runner-compose.yml up -d

# View logs
docker-compose -f runner-compose.yml logs -f
```

## Troubleshooting

**Runner doesn't register:**

```bash
docker-compose -f runner-compose.yml logs forgejo-runner
```

Check token is correct and not expired. Get a new one from Codeberg.

**Docker build fails:**

```bash
# SSH to VPS and test Docker
docker ps
docker run hello-world
```

**Runner not picking up jobs:**
Check it appears as "Active" in Codeberg settings. If not, restart it.

## Security

- Runner has access to `docker.sock` → full Docker control
- Only run this on your own VPS
- Token expires, so get a new one if runner stops working
- Runner downloads and runs your CI code, so only trust your own pushes
