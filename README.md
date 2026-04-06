# Debridgers Monorepo

A pnpm monorepo for the Debridgers platform — a marketplace connecting farmers directly with buyers for fresh farm produce. Houses the web app, NestJS backend, shared component libraries, and tooling.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Apps](#apps)
- [Packages](#packages)
- [Libs](#libs)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Root Scripts Reference](#root-scripts-reference)
- [Import Aliases](#import-aliases)
- [Branch Naming](#branch-naming)
- [Code Quality](#code-quality)
- [Database](#database)
- [Building for Production](#building-for-production)
- [Docker](#docker)
- [Bundle Analysis](#bundle-analysis)
- [Adding a New App](#adding-a-new-app)
- [Adding a New Package / Library](#adding-a-new-package--library)
- [Troubleshooting](#troubleshooting)

---

## Project Structure

```
debridgers-repo/
├── api/                         # Vercel serverless API entry (index.ts)
├── apps/
│   ├── landing-page/            # @debridgers/landing-page — React Router v7 SSR web app
│   ├── debridgers-backend/      # @debridgers/debridgers-backend — NestJS REST API
│   └── debridgers-backend-e2e/  # E2E test suite for the backend (Jest)
├── packages/
│   ├── ui-web/                  # @debridgers/ui-web — Shadcn-style web components
│   ├── ui-app/                  # @debridgers/ui-app — Mobile/Ionic-style components
│   └── api-client/              # @debridgers/api-client — Shared API client (axios wrappers)
├── libs/
│   ├── shared-theme/            # @debridgers/shared-theme — Tailwind CSS preset + design tokens
│   └── shared-utils/            # @debridgers/shared-utils — Shared utility functions
├── docker/                      # Dockerfiles and docker-compose
├── docs/                        # API and feature documentation (auth, admin, agent, backend)
├── scripts/                     # Utility/generator scripts
├── package.json                 # Root workspace config + shared scripts
├── pnpm-workspace.yaml          # pnpm workspace definition
├── tsconfig.base.json           # Base TypeScript config extended by all packages
├── tsconfig.json                # Root TypeScript config
├── eslint.config.mjs            # Root ESLint config (flat config)
├── prettier.config.cjs          # Prettier config
└── vitest.workspace.ts          # Vitest workspace config
```

---

## Apps

### `apps/landing-page` — `@debridgers/landing-page`

The main web application. Built with React Router v7 (SSR), Tailwind CSS v4, and TypeScript. Deployed on Vercel.

```
apps/landing-page/
├── app/
│   ├── components/      # App-level shared components
│   ├── contexts/        # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── models/          # Data models / types
│   ├── routes/          # File-based routes (React Router v7)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # App-level utility functions
│   ├── entry.client.tsx # Client hydration entry
│   ├── root.tsx         # Root layout
│   ├── routes.ts        # Route manifest
│   └── styles.css       # Global styles
├── public/              # Static assets (images, logos, favicon)
├── entry.server.tsx     # SSR server entry
├── react-router.config.ts
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

```bash
# From root — targets frontend only
pnpm dev:landing          # Dev server (http://localhost:3000)
pnpm build:landing        # Production build
pnpm start:landing        # Serve production build
pnpm typecheck:landing    # Type check
pnpm lint:landing         # Lint
pnpm lint:fix:landing     # Lint + auto-fix
pnpm analyze              # Bundle size visualizer (opens in browser)

# From apps/landing-page directly
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm analyze
```

---

### `apps/debridgers-backend` — `@debridgers/debridgers-backend`

The REST API. Built with NestJS, Drizzle ORM, PostgreSQL (Neon), and Mailtrap for email.

```
apps/debridgers-backend/
├── src/
│   ├── app/
│   │   ├── admin/       # Admin module (manage agents, users)
│   │   ├── agent/       # Agent application + report submission
│   │   ├── auth/        # Auth module (JWT, guards, decorators)
│   │   ├── contact/     # Contact form module
│   │   ├── payment/     # Paystack payment integration
│   │   ├── app.module.ts
│   │   └── app.controller.ts
│   ├── events/          # Event emitters and listeners
│   ├── infrastructure/
│   │   ├── config/      # App configs (DB, JWT, Cloudinary, Mailtrap, Paystack)
│   │   ├── database/    # Drizzle DB module + provider
│   │   ├── helper/      # Column helpers
│   │   ├── logger/      # Pino logger module
│   │   ├── schema/      # Drizzle schema definitions
│   │   └── seeders/     # DB seed scripts
│   ├── interceptors/    # NestJS interceptors
│   ├── interfaces/      # Shared TypeScript interfaces
│   ├── notification/    # Notification service (email)
│   └── main.ts          # App bootstrap
├── drizzle.config.ts    # Drizzle Kit config
└── nest-cli.json
```

```bash
# From root — targets backend only
pnpm dev:backend          # Watch mode (http://localhost:4000)
pnpm build:backend        # Production build
pnpm start:backend        # Serve production build
pnpm typecheck:backend    # Type check
pnpm lint:backend         # Lint
pnpm lint:fix:backend     # Lint + auto-fix
pnpm db:migrate           # Run DB migrations
pnpm db:generate          # Generate migration files
pnpm db:seed              # Seed admin user
pnpm test:e2e             # Run e2e tests (requires backend running)

# From apps/debridgers-backend directly
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm test                 # Unit tests (vitest --run)
pnpm db:migrate
pnpm db:generate
pnpm db:seed
```

---

### `apps/debridgers-backend-e2e`

End-to-end test suite for the backend. Uses Jest.

```bash
# From root
pnpm test:e2e

# From apps/debridgers-backend-e2e directly
pnpm test
```

---

## Packages

Packages are buildable with `tsup` and consumed via workspace aliases (`workspace:*`).

### `packages/ui-web` — `@debridgers/ui-web`

Shadcn-style web components (Radix UI + Tailwind). Used in web apps.

```tsx
import { Button } from "@debridgers/ui-web";
```

```bash
# From root
pnpm dev:ui-web            # Watch mode
pnpm build:ui-web          # Build dist/
pnpm watch:ui-web          # Alias for watch mode

# From packages/ui-web directly
pnpm dev
pnpm build
```

### `packages/ui-app` — `@debridgers/ui-app`

Mobile-optimized components for Ionic/Capacitor apps.

```tsx
import { MobileButton } from "@debridgers/ui-app";
```

```bash
# From packages/ui-app directly
pnpm dev
pnpm build
```

### `packages/api-client` — `@debridgers/api-client`

Shared API client with typed axios wrappers for consuming the backend.

```ts
import { apiClient } from "@debridgers/api-client";
```

> In `apps/landing-page`, `ui-web` and `ui-app` are aliased directly to their `src/` in Vite — no need to build them during development. See [Import Aliases](#import-aliases).

---

## Libs

### `libs/shared-theme` — `@debridgers/shared-theme`

Centralized Tailwind CSS preset with shared design tokens (colors, spacing, etc.).

```ts
// tailwind.config.ts
import preset from "@debridgers/shared-theme";

export default {
  presets: [preset],
  content: ["./app/**/*.{ts,tsx}"],
};
```

### `libs/shared-utils` — `@debridgers/shared-utils`

Shared utility functions used across apps and packages.

```ts
import { cn } from "@debridgers/shared-utils";
```

---

## Getting Started

### Prerequisites

- Node.js 24.x
- pnpm 10+

```bash
npm install -g pnpm
```

### Install

```bash
pnpm install
```

### Environment variables

Each app has its own `.env`. Copy and fill in:

```bash
cp apps/debridgers-backend/.env.example apps/debridgers-backend/.env
cp .env.example .env
```

### Run everything in dev

```bash
pnpm dev          # Runs all apps in parallel
```

Or individually:

```bash
pnpm dev:landing
pnpm dev:backend
```

---

## Development Workflow

### Working on UI packages without rebuilding

`apps/landing-page` aliases `@debridgers/ui-web` and `@debridgers/ui-app` directly to their `src/` in Vite. Changes to components are picked up instantly via HMR — no `tsup --watch` needed.

### Working on packages consumed via dist/

If another app consumes a package via its built `dist/`, run watch mode:

```bash
pnpm --filter @debridgers/ui-web dev
pnpm --filter @debridgers/ui-app dev
```

---

## Root Scripts Reference

**Both apps (backend + frontend)**

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | Start backend + frontend in parallel          |
| `pnpm build`        | Build backend + frontend in parallel          |
| `pnpm start`        | Serve production builds of backend + frontend |
| `pnpm typecheck`    | Type check backend + frontend in parallel     |
| `pnpm lint`         | Lint backend + frontend in parallel           |
| `pnpm lint:fix`     | Lint + autofix backend + frontend in parallel |
| `pnpm format`       | Prettier format everything                    |
| `pnpm format:check` | Check formatting without writing              |
| `pnpm test`         | Run all tests across workspaces               |

**Frontend only**

| Script                   | What it does                           |
| ------------------------ | -------------------------------------- |
| `pnpm dev:landing`       | Dev server (http://localhost:3000)     |
| `pnpm build:landing`     | Production build                       |
| `pnpm start:landing`     | Serve production build                 |
| `pnpm typecheck:landing` | Type check                             |
| `pnpm lint:landing`      | Lint                                   |
| `pnpm lint:fix:landing`  | Lint + auto-fix                        |
| `pnpm analyze`           | Bundle size visualizer (opens browser) |

**Backend only**

| Script                   | What it does                             |
| ------------------------ | ---------------------------------------- |
| `pnpm dev:backend`       | Watch mode (http://localhost:4000)       |
| `pnpm build:backend`     | Production build                         |
| `pnpm start:backend`     | Serve production build                   |
| `pnpm typecheck:backend` | Type check                               |
| `pnpm lint:backend`      | Lint                                     |
| `pnpm lint:fix:backend`  | Lint + auto-fix                          |
| `pnpm db:generate`       | Generate Drizzle migrations              |
| `pnpm db:migrate`        | Run Drizzle migrations                   |
| `pnpm db:seed`           | Seed the database                        |
| `pnpm test:e2e`          | Run e2e tests (requires backend running) |

**UI packages**

| Script              | What it does          |
| ------------------- | --------------------- |
| `pnpm dev:ui-web`   | Watch mode for ui-web |
| `pnpm build:ui-web` | Build ui-web          |
| `pnpm watch:ui-web` | Alias for watch mode  |

---

## Import Aliases

Configured in `apps/landing-page/vite.config.ts` and `tsconfig.json`:

| Alias                | Resolves to               |
| -------------------- | ------------------------- |
| `@/*`                | `apps/landing-page/app/*` |
| `@debridgers/ui-web` | `packages/ui-web/src`     |
| `@debridgers/ui-app` | `packages/ui-app/src`     |

```tsx
import { Button } from "@debridgers/ui-web";
import { MobileButton } from "@debridgers/ui-app";
import { MyComponent } from "@/components/my-component";
```

---

## Branch Naming

Enforced via `validate-branch-name` in the pre-push hook.

**Allowed patterns:**

```
main
develop
live
feature/short-description
fix/short-description
refactor/short-description
hotfix/short-description
release/short-description
conflict/short-description
chore/short-description
```

Pushes with non-conforming branch names will be blocked.

---

## Code Quality

```bash
pnpm lint           # Lint all
pnpm lint:fix       # Lint + autofix all
pnpm format         # Prettier format all
pnpm format:check   # Check formatting
```

Pre-commit hooks (Husky + lint-staged) run Prettier and ESLint on staged files automatically.

Pre-push hooks enforce:

- Branch name validation
- Large file check (blocks files over 500KB)
- Protected branch rules for `main`

---

## Database

The backend uses Drizzle ORM with PostgreSQL (Neon serverless).

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Seed the database with initial data
pnpm db:seed

# Open Drizzle Studio (visual DB browser)
pnpm --filter @debridgers/debridgers-backend db:studio
```

Schema files live in `apps/debridgers-backend/src/infrastructure/schema/`.

---

## Building for Production

```bash
# Build everything
pnpm build

# Build specific app
pnpm build:landing
pnpm build:backend
```

---

## Docker

```bash
# Start all services
docker compose -f docker/docker-compose.yml up

# Build and start
docker compose -f docker/docker-compose.yml up --build

# Stop
docker compose -f docker/docker-compose.yml down
```

Individual Dockerfiles:

- `docker/landing.Dockerfile` — landing page
- `docker/backend.Dockerfile` — backend

---

## Bundle Analysis

Inspect what's bloating the landing page bundle:

```bash
pnpm --filter @debridgers/landing-page run analyze
```

Or from inside `apps/landing-page`:

```bash
pnpm analyze
```

Opens a treemap in your browser showing every package and asset by size. Run after `pnpm build:landing` for accurate results.

---

## Adding a New App

1. Create the app directory under `apps/`
2. Add a `package.json` with a unique `name` (e.g. `@debridgers/my-app`)
3. It will be auto-discovered by pnpm workspaces
4. Add workspace scripts to the root `package.json` if needed

---

## Adding a New Package / Library

1. Create under `packages/` or `libs/`
2. Add `package.json` with `name: "@debridgers/my-package"`
3. Add `tsup.config.ts` for building
4. Export from `src/index.ts`
5. Reference in consuming apps via `workspace:*` in their `package.json`

---

## Troubleshooting

**Clean the pnpm store (remove unreferenced/cached packages)**

```bash
pnpm store prune
```

**Hard reset — nuke node_modules and reinstall**

```bash
find . -name "node_modules" -type d -not -path "*/.git/*" | xargs rm -rf
find . -name "pnpm-lock.yaml" -type f -delete
pnpm install
```

**Module not found for a workspace package**

Make sure the package has been built if consumed via `dist/`:

```bash
pnpm --filter @debridgers/ui-web build
pnpm --filter @debridgers/ui-app build
```

**Type errors on `@debridgers/ui-web` or `@debridgers/ui-app`**

Check that `tsconfig.json` paths are set correctly in the consuming app. See `apps/landing-page/tsconfig.json` for reference.

**Port already in use**

The landing page dev server runs on port 3000. Kill the existing process or change `server.port` in `vite.config.ts`.

**Backend not connecting to DB**

Ensure `apps/debridgers-backend/.env` has the correct `DATABASE_URL` pointing to your Neon instance.

**Drizzle migration errors**

Run generate before migrate — never edit migration files manually:

```bash
pnpm db:generate
pnpm db:migrate
```

**Pre-push hook blocking large files**

Find what's large:

```bash
git ls-files | xargs -I{} sh -c 'size=$(wc -c < "{}"); echo "$size {}"' | sort -rn | head -20
```

Add the file to `.gitignore` or remove it from tracking:

```bash
git rm --cached path/to/large-file
```

**Husky hooks not running**

```bash
pnpm prepare
```
