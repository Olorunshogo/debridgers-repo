FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @debridgers/landing-page build

EXPOSE 3000

CMD ["pnpm", "--filter", "@debridgers/landing-page", "start"]