# syntax=docker/dockerfile:1
#
# Build context is the REPOSITORY ROOT, not this directory:
#   docker build -f apps/debridgers-frontend/Dockerfile .
#
# This replaces the stock React Router template Dockerfile, which ran `npm ci`
# against a package-lock.json that does not exist in this pnpm workspace and so
# could never build.
#
# Nothing in Phase 8 deploys this image. It exists so the frontend can be built
# and run the same way as the API when that decision is made; today the frontend
# is hosted separately.

# === Base
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# === Build
# Filtered topologically so ui-web, shared-utils and the other workspace
# packages that resolve to dist are built before the app that imports them.
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@debridgers/debridgers-frontend..." build

# === Production dependencies
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
      --filter "@debridgers/debridgers-frontend..."

# === Runtime
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/debridgers-frontend/node_modules ./apps/debridgers-frontend/node_modules

# Workspace links under apps/debridgers-frontend/node_modules are relative
# symlinks into these directories, so each one has to exist here with whatever
# its package.json "main" points at.
COPY packages/api-client ./packages/api-client
COPY libs/shared-theme ./libs/shared-theme
COPY packages/pricing/package.json ./packages/pricing/package.json
COPY --from=build /app/packages/pricing/dist ./packages/pricing/dist
COPY packages/ui-web/package.json ./packages/ui-web/package.json
COPY --from=build /app/packages/ui-web/dist ./packages/ui-web/dist
COPY libs/shared-utils/package.json ./libs/shared-utils/package.json
COPY --from=build /app/libs/shared-utils/dist ./libs/shared-utils/dist

COPY apps/debridgers-frontend/package.json ./apps/debridgers-frontend/
COPY --from=build /app/apps/debridgers-frontend/build ./apps/debridgers-frontend/build

WORKDIR /app/apps/debridgers-frontend
USER node
EXPOSE 3000
CMD ["node", "node_modules/.bin/react-router-serve", "./build/server/index.js"]
