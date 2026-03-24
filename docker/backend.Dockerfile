FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @debridgers/backend build

EXPOSE 4000

CMD ["node", "apps/backend/dist/index.js"]