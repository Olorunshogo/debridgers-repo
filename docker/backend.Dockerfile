FROM node:20-alpine AS base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Every workspace manifest must be present before install. With only a subset,
# pnpm populates the store but cannot build the per-member node_modules symlink
# trees, so `pnpm --filter <member>` finds no binaries.
COPY apps/debridgers-backend/package.json apps/debridgers-backend/
COPY apps/debridgers-backend-e2e/package.json apps/debridgers-backend-e2e/
COPY apps/debridgers-frontend/package.json apps/debridgers-frontend/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-app/package.json packages/ui-app/
COPY packages/ui-web/package.json packages/ui-web/

RUN pnpm install --frozen-lockfile

COPY . .

# === Dev
# Source is bind-mounted over this layer by docker-compose.dev.yml, so
# nest --watch recompiles on edits made on the host. node_modules is not
# mounted, which keeps the musl-built native deps (bcrypt) that the host's
# glibc copies would break.
FROM base AS dev

EXPOSE 4001

CMD ["pnpm", "--filter", "@debridgers/debridgers-backend", "dev"]

# === Production
# Last stage, so a build with no explicit target still produces this.
FROM base AS prod

RUN pnpm --filter @debridgers/debridgers-backend build

EXPOSE 4001

CMD ["node", "apps/debridgers-backend/dist/main.js"]
