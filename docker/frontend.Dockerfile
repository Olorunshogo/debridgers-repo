FROM node:20-alpine AS base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Every workspace manifest must be present before install. With only the root
# package.json, pnpm populates the store but cannot build the per-member
# node_modules symlink trees, so `pnpm --filter <member>` finds no binaries.
COPY apps/debridgers-backend/package.json apps/debridgers-backend/
COPY apps/debridgers-backend-e2e/package.json apps/debridgers-backend-e2e/
COPY apps/debridgers-frontend/package.json apps/debridgers-frontend/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-app/package.json packages/ui-app/
COPY packages/ui-web/package.json packages/ui-web/

RUN pnpm install --frozen-lockfile

COPY . .

# === Dev
# --host is required: without it Vite binds to localhost inside the container
# and the port publish looks dead from the host.
FROM base AS dev

EXPOSE 5173

CMD ["pnpm", "--filter", "@debridgers/debridgers-frontend", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# === Production
# Last stage, so a build with no explicit target still produces this.
FROM base AS prod

RUN pnpm --filter @debridgers/debridgers-frontend build

EXPOSE 3000

CMD ["pnpm", "--filter", "@debridgers/debridgers-frontend", "start"]
