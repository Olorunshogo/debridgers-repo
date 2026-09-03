# syntax=docker/dockerfile:1
#
# Build context is the REPOSITORY ROOT, not this directory:
#   docker build -f apps/debridgers-backend/Dockerfile .
# A pnpm workspace cannot be installed from a single package folder, because the
# lockfile and every sibling manifest live above it.

# === Base
# Node major tracks .nvmrc. corepack takes the pnpm version from the root
# package.json "packageManager" field, so it is not restated here.
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# === Build
# The full workspace is installed once, then the backend is built through pnpm's
# topological filter so every workspace package it imports is built first. The
# API resolves @debridgers/pricing to dist, so building the backend alone leaves
# an image that starts and dies with ERR_MODULE_NOT_FOUND.
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@debridgers/debridgers-backend..." build

# === Production dependencies
# Installed from manifests alone so a source-only change does not invalidate
# this layer. Only the backend and what it depends on are resolved; the frontend
# manifest is copied because pnpm refuses to install a workspace whose members
# are missing, not because anything here needs it.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/debridgers-backend/package.json apps/debridgers-backend/
COPY apps/debridgers-backend-e2e/package.json apps/debridgers-backend-e2e/
COPY apps/debridgers-frontend/package.json apps/debridgers-frontend/
COPY packages/api-client/package.json packages/api-client/
COPY packages/pricing/package.json packages/pricing/
COPY packages/ui-app/package.json packages/ui-app/
COPY packages/ui-web/package.json packages/ui-web/
COPY libs/shared-theme/package.json libs/shared-theme/
COPY libs/shared-utils/package.json libs/shared-utils/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts \
      --filter "@debridgers/debridgers-backend..."

# === Runtime
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4001

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/debridgers-backend/node_modules ./apps/debridgers-backend/node_modules

# The workspace link apps/debridgers-backend/node_modules/@debridgers/pricing is
# a relative symlink into packages/pricing, so that directory has to exist here
# with its built output or every import through it dangles.
COPY packages/pricing/package.json ./packages/pricing/package.json
COPY --from=build /app/packages/pricing/dist ./packages/pricing/dist

COPY apps/debridgers-backend/package.json apps/debridgers-backend/drizzle.config.ts ./apps/debridgers-backend/
COPY --from=build /app/apps/debridgers-backend/dist ./apps/debridgers-backend/dist

# drizzle.config.ts points `out` at the source tree, so the migration SQL has to
# be reachable at that path and not only at the copy nest-cli puts in dist.
COPY apps/debridgers-backend/src/infrastructure/persistence/migrations ./apps/debridgers-backend/src/infrastructure/persistence/migrations

# Migrations run from this image, and drizzle-kit is a devDependency that the
# production install above deliberately drops. Installing it globally at the
# version the workspace pins keeps the runtime tree production-only without
# restating that version in a second place.
RUN DRIZZLE_KIT_VERSION="$(node -p "require('/app/apps/debridgers-backend/package.json').devDependencies['drizzle-kit']")" \
  && npm install -g --no-audit --no-fund "drizzle-kit@${DRIZZLE_KIT_VERSION}" \
  && npm cache clean --force

WORKDIR /app/apps/debridgers-backend
USER node
EXPOSE 4001

# Localhost only. Nothing publishes a host port; cloudflared reaches this over
# the compose network.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4001)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
