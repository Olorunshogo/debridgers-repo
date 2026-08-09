FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/debridgers-backend/package.json ./apps/debridgers-backend/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @debridgers/debridgers-backend build

EXPOSE 4001

CMD ["node", "apps/debridgers-backend/dist/main.js"]
