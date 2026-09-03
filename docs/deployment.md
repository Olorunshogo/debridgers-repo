# Deployment

How the Debridgers API gets from a push to a running container answering on its
public hostname.

## Shape

- CI builds `apps/debridgers-backend/Dockerfile` and pushes to GHCR.
- CI connects to the host over SSH, syncs `deploy/`, and runs `deploy.sh`.
- `deploy.sh` pulls, renders the tunnel ingress, migrates, restarts, and smoke
  tests through the public hostname.
- A Cloudflare Tunnel dials out to Cloudflare. Nothing dials in, no container
  publishes a host port, and the firewall allows only SSH.

```
deploy/
  bootstrap.sh                     one-time host setup
  deploy.sh                        pull, render ingress, migrate, up, smoke test
  docker-compose.prod.yml          backend + postgres + redis + cloudflared
  cloudflared/config.template.yml  ingress, rendered at deploy time
```

## Fill this in first

`GHCR_OWNER` is a placeholder everywhere it appears. It is the GitHub user or
organisation that owns this repository, and the image path is

```
ghcr.io/<owner>/debridgers/debridgers-backend
```

The workflow fills it from `github.repository_owner` automatically. Only a
manual `deploy.sh` run needs it typed out, and after the first deploy it is
persisted in the host `.env`.

## One-time host setup

On a fresh Ubuntu or Debian VPS, as root:

```bash
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# paste the CI public key
vim /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

curl -fsSLO https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/bootstrap.sh
sudo bash bootstrap.sh deploy
```

`bootstrap.sh` installs Docker, adds `deploy` to the docker group, sets `ufw` to
deny all inbound except SSH, and creates `/opt/debridgers` with an empty `.env`.
It is safe to re-run.

Then, by hand and once:

1. Create the tunnel in the Cloudflare dashboard or with `cloudflared tunnel
   create debridgers-api`.
2. Copy its credentials JSON to `/opt/debridgers/cloudflared/credentials.json`.
   `deploy.sh` fixes its ownership; you only have to put it there.
3. Set `TUNNEL_ID` and `API_HOSTNAME` in `/opt/debridgers/.env`.
4. Add a proxied CNAME for `API_HOSTNAME` pointing at
   `<TUNNEL_ID>.cfargotunnel.com`. Without it the tunnel is healthy and serves
   nothing.

## GitHub configuration

Two Environments: `dev` (deployed from `develop`) and `production` (deployed
from `main`). Each carries its own host and its own secrets.

| Name | Kind | What it is |
| --- | --- | --- |
| `SSH_HOST` | secret | Host address |
| `SSH_USER` | secret | Deploy user, `deploy` above |
| `SSH_PRIVATE_KEY` | secret | Private half of the key in `authorized_keys` |
| `SSH_PORT` | variable | Optional, defaults to 22 |
| `DEPLOY_ENV_B64` | secret | `base64 -w0` of the application `.env` |

`GITHUB_TOKEN` covers the GHCR push and pull; no personal token is needed.

To update the application configuration:

```bash
base64 -w0 < prod.env    # paste the result into DEPLOY_ENV_B64
```

## The host .env

Two halves in one file.

- **Host-managed:** `TUNNEL_ID`, `API_HOSTNAME`, `IMAGE_TAG`, `GHCR_OWNER`.
  `deploy.sh` carries these forward from the file already on the host and
  strips them out of the incoming secret. They describe the machine, not the
  application, and a secret that forgot one of them used to blank it.
- **Application:** everything else, replaced wholesale from `DEPLOY_ENV_B64` on
  every deploy.

Two safety rules are deliberate:

- An empty or whitespace-only `DEPLOY_ENV_B64` aborts the deploy rather than
  writing an empty file. An empty secret is nearly always a misconfigured
  repository secret.
- Every write backs the old file up to `/opt/debridgers/env-backups/` with a
  UTC timestamp, keeping the last 5.

Application keys the API needs, from `main.ts` and the guards: `DATABASE_URL`,
`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ALLOWED_ORIGINS`,
`UPSTASH_REDIS_URL`, `REQUEST_KEY`, `ADMIN_KEY_1`, `ADMIN_KEY_2`,
`PAYMENT_KEY_1`, `PAYMENT_KEY_2`, `PAYSTACK_SECRET_KEY`, plus the Postgres
credentials the compose stack uses: `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_DB`.

With in-stack Postgres, `DATABASE_URL` points at the compose service:

```
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
UPSTASH_REDIS_URL=redis://redis:6379
```

`NODE_ENV` and `PORT` are set by the compose file and do not belong in the
secret.

## Two boot refusals that look like a crash loop

`main.ts` exits on purpose, before listening, when either is true in
production. The container then restarts forever and the logs scroll past the
one line that explains it.

- `PAYMENTS_SIMULATED=true` marks orders paid without taking money. In
  production that mints free orders, so it refuses to start.
- `PAYSTACK_SECRET_KEY` starting with `sk_test_` sends real checkouts to a
  sandbox that never settles, silently from the buyer's side.

It also exits when `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` or
`DATABASE_URL` is missing. Check `docker compose logs backend | head -30`
before assuming anything else.

## Migrations

`deploy.sh` runs them from the image being deployed, before the new code
starts, so the SQL always matches the binary that will serve it:

```bash
docker compose run --rm backend drizzle-kit migrate
```

`drizzle-kit` is a devDependency, so the runtime image installs it globally at
the version the workspace pins. The migration SQL is copied to the source path
`drizzle.config.ts` names, not only into `dist`.

### A database that predates the migration rewrite

The migration set was regenerated, so the files' hashes no longer match what
drizzle recorded. On such a database `migrate` tries to replay a baseline
`CREATE TABLE` script against tables that already exist and fails.

`apps/debridgers-backend/src/baseline.ts` marks migrations applied without
running them. Take a dump, dry-run, then run it, once, before the first
`migrate`:

```bash
pg_dump "$DATABASE_URL" > pre-baseline.sql
pnpm --filter @debridgers/debridgers-backend exec tsx src/baseline.ts --through <tag> --dry
pnpm --filter @debridgers/debridgers-backend exec tsx src/baseline.ts --through <tag>
```

`<tag>` is the last migration whose effects are already present in that
database, from `src/infrastructure/persistence/migrations/meta/_journal.json`.
It refuses to run without `--through`, because baselining everything would mark
unrun migrations as done, which is silent data loss.

A brand new database needs none of this. Run `migrate` and it applies
everything from empty.

## The smoke test

Against `https://$API_HOSTNAME/api/v1/health`, ten attempts with a growing
delay. Never against localhost: a backend answering on the compose network
while the tunnel is down looks perfectly healthy from inside the host, which is
the exact outage the test exists to catch. On failure it dumps backend and
cloudflared logs and container state, and exits non-zero so the workflow goes
red.

`GET /api/v1/health` already existed; nothing was added for this.

## Rollback

Every build is tagged with its short commit SHA, so a rollback is a redeploy of
a known commit:

```bash
ssh deploy@$HOST
IMAGE_TAG=<short-sha> GHCR_OWNER=<owner> bash /opt/debridgers/deploy.sh
```

Omitting `DEPLOY_ENV_B64` leaves the host `.env` exactly as it is, which is
what you want when rolling back code and nothing else. A rollback across a
migration is not automatic: drizzle has no down migrations here, so restore
from a dump instead.

## Postgres in the stack, or managed

**This is an open decision. What ships today runs Postgres in the compose
stack.** It is the cheapest option and it keeps everything on one host, but it
puts the entire backup burden on the operator.

### What in-stack Postgres requires before go-live

- A scheduled `pg_dump` off the host, encrypted, with retention.
- A **verified restore drill**. An untested backup is not a backup, and this
  database records money owed.
- Awareness that there is no point-in-time recovery. The blast radius of a bad
  write is everything since the last dump.

### Switching to managed Postgres

The reason to switch is backups and point-in-time recovery you do not maintain
yourself, plus restores you have not had to rehearse.

1. Restore the current data into the managed instance.
2. Delete the `postgres` service from `deploy/docker-compose.prod.yml`, and its
   entry under the backend's `depends_on`.
3. Point `DATABASE_URL` at the managed instance, with TLS.
4. Leave the `postgres_data` volume in place until a restore has been verified
   against the new instance.

Redis stays in the stack either way. It holds cache, not money.

## Manual operations

```bash
cd /opt/debridgers
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend
docker compose -f docker-compose.prod.yml --env-file .env restart cloudflared
```

`cloudflared` reads its ingress once, at start. Any change to
`cloudflared/config.template.yml` or to `API_HOSTNAME` needs a recreate, which
is why `deploy.sh` force-recreates it on every deploy.

## The frontend

`apps/debridgers-frontend/Dockerfile` was the stock React Router template and
ran `npm ci` against a `package-lock.json` this pnpm workspace does not have,
so it could never build. It is now a working pnpm and workspace build, but no
pipeline deploys it: the frontend is hosted separately. It exists so the choice
to containerise it later is a decision and not a rewrite.
