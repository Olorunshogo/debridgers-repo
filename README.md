# Debridgers Monorepo

A pnpm monorepo for Debridgers, a marketplace connecting farmers directly with buyers for fresh farm produce. The repo contains the web app, NestJS backend, shared packages, and support tooling.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Apps](#apps)
- [Packages](#packages)
- [Libs](#libs)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Scripts](#scripts)
- [Import Aliases](#import-aliases)
- [Workspace Paths](#workspace-paths)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Project Structure

```
debridgers-repo/
├── api/                         # Vercel serverless API entrypoint
├── apps/
│   ├── debridgers-frontend/      # React Router v7 SSR frontend app
│   ├── debridgers-backend/       # NestJS REST backend
│   └── debridgers-backend-e2e/   # Backend E2E test suite (Jest)
├── packages/
│   ├── ui-web/                   # @debridgers/ui-web - shared web UI components
│   ├── ui-app/                   # @debridgers/ui-app - shared mobile UI components
│   └── api-client/               # @debridgers/api-client - shared API client
├── libs/
│   ├── shared-theme/             # @debridgers/shared-theme - Tailwind tokens + preset
│   └── shared-utils/             # @debridgers/shared-utils - shared helper utilities
├── docker/                      # Docker Compose and Dockerfiles
├── docs/                        # Project documentation and research notes
├── package.json                 # Root workspace scripts and dependency versions
├── pnpm-workspace.yaml          # Workspace package layout
├── tsconfig.base.json           # Root TypeScript path configuration
├── tsconfig.json                # Root TypeScript references
├── eslint.config.mjs            # Root ESLint configuration
├── prettier.config.cjs          # Prettier configuration
└── vitest.workspace.ts          # Vitest workspace config
```

---

## Apps

### `apps/debridgers-frontend`

Frontend web application built with React Router v7, Tailwind CSS v4, and TypeScript. It supports SSR and uses shared workspace packages for UI components and backend API access.

Key features:

- Landing pages and marketing site
- Auth flows (`/login`, `/signup`, `/forgot-password`, `/verify-email`)
- Buyer, agent, and admin dashboards
- Shared API client via `@debridgers/api-client`

### `apps/debridgers-backend`

NestJS REST API with Drizzle ORM and PostgreSQL.

Key features:

- Auth module, JWT, guards, and decorators
- Admin, agent, buyer, commission, payment, and contact modules
- Drizzle schema / migration support
- Cloudinary, Mailtrap, and Paystack integration support

### `apps/debridgers-backend-e2e`

Backend end-to-end test suite using Jest.

---

## Packages

### `packages/ui-web`

Shared web UI component library.

```tsx
import { Button } from "@debridgers/ui-web";
```

### `packages/ui-app`

Shared app/mobile UI component library.

```tsx
import { MobileButton } from "@debridgers/ui-app";
```

### `packages/api-client`

Shared API client and auth helpers. This package exports the backend URL, typed request helpers, cookie auth helpers, token storage, refresh handling, and auth types.

```ts
import { apiFetch, BASE_BACKEND_URL, JwtPayload } from "@debridgers/api-client";
```

This package is consumed by `apps/debridgers-frontend` via a Vite alias that points directly to `packages/api-client/src`.

---

## Libs

### `libs/shared-theme`

Tailwind preset and design tokens used across the frontend app.

### `libs/shared-utils`

Shared helper utilities for the monorepo.

---

## Getting Started

### Prerequisites

- Node.js 24.x
- pnpm 10.x

### Install

```bash
pnpm install
```

### Environment setup

Copy example env files as needed:

```bash
cp apps/debridgers-backend/.env.example apps/debridgers-backend/.env
cp apps/debridgers-frontend/.env.example apps/debridgers-frontend/.env
```

Update the `.env` values for your local environment.

### Local database

The backend uses PostgreSQL. For local development, use Docker.

```bash
pnpm docker:up
pnpm db:migrate
pnpm db:seed
```

Or run both in one command:

```bash
pnpm docker:migrate
```

---

## Development Workflow

### Run the full stack

```bash
pnpm dev
```

### Frontend only

```bash
pnpm dev:frontend
```

### Backend only

```bash
pnpm dev:backend
```

### Package development

For `ui-web` and `ui-app`, use watch mode locally when iterating on shared UI components:

```bash
pnpm dev:ui-web
pnpm watch:ui-web
```

---

## Scripts

### Root workspace scripts

| Script                                  | Purpose                                             |
| --------------------------------------- | --------------------------------------------------- |
| `pnpm dev`                              | Run frontend and backend in parallel                |
| `pnpm build`                            | Build all workspace targets                         |
| `pnpm start`                            | Serve all production builds                         |
| `pnpm typecheck`                        | Type check all projects                             |
| `pnpm lint`                             | Lint all projects                                   |
| `pnpm lint:fix`                         | Lint + auto-fix all projects                        |
| `pnpm analyze`                          | Run bundle analysis for frontend                    |
| `pnpm dev:frontend`                     | Run frontend dev server                             |
| `pnpm build:frontend`                   | Build frontend                                      |
| `pnpm start:frontend`                   | Serve frontend production build                     |
| `pnpm typecheck:frontend`               | Frontend type check                                 |
| `pnpm lint:frontend`                    | Frontend lint                                       |
| `pnpm lint:fix:frontend`                | Frontend lint + fix                                 |
| `pnpm dev:backend`                      | Run backend dev server                              |
| `pnpm build:backend`                    | Build backend                                       |
| `pnpm start:backend`                    | Serve backend production build                      |
| `pnpm typecheck:backend`                | Backend type check                                  |
| `pnpm lint:backend`                     | Backend lint                                        |
| `pnpm lint:fix:backend`                 | Backend lint + fix                                  |
| `pnpm db:migrate`                       | Run backend migrations                              |
| `pnpm db:generate`                      | Generate a migration file                           |
| `pnpm db:seed`                          | Seed database                                       |
| `pnpm docker:up`                        | Start local Postgres container                      |
| `pnpm docker:down`                      | Stop local Postgres container                       |
| `pnpm docker:migrate`                   | Start Postgres + run migrations                     |
| `pnpm nx run debridgers-backend:docker` | Start Postgres, migrate, and run backend dev server |
| `pnpm test:e2e`                         | Run backend e2e tests                               |
| `pnpm dev:ui-web`                       | Run ui-web watch mode                               |
| `pnpm build:ui-web`                     | Build ui-web package                                |
| `pnpm watch:ui-web`                     | Alias for ui-web watch mode                         |

---

## Import Aliases

`apps/debridgers-frontend` uses path aliases for workspace packages and app sources.

| Alias                      | Resolves to                      |
| -------------------------- | -------------------------------- |
| `@/*`                      | `apps/debridgers-frontend/app/*` |
| `@debridgers/ui-web`       | `packages/ui-web/src`            |
| `@debridgers/ui-app`       | `packages/ui-app/src`            |
| `@debridgers/api-client`   | `packages/api-client/src`        |
| `@debridgers/shared-theme` | `libs/shared-theme/src`          |
| `@debridgers/shared-utils` | `libs/shared-utils/src`          |

Example:

```ts
import { apiFetch } from "@debridgers/api-client";
import { Button } from "@debridgers/ui-web";
```

---

## Workspace Paths

The root `tsconfig.base.json` centralizes package path aliases for the repo.

---

## Troubleshooting

### `@react-router/dev` not found

Run `pnpm install` from the repo root to populate workspace dependencies.

### `pnpm nx` or `nx` commands fail

Make sure you have installed the repo dependencies, then run:

```bash
pnpm install
```

If the error persists, delete `node_modules` and reinstall.

### Frontend typecheck

```bash
pnpm typecheck:frontend
```

### Backend migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### Run e2e tests

```bash
pnpm test:e2e
```

---

## Notes

`docs/FOLDER_README.md` has been merged into this README and is now a secondary reference. Use this file as the source of truth for repo onboarding and workspace setup.

---

## Contributing

Please follow the repo's branch naming conventions and lint rules. Use `pnpm lint`, `pnpm format`, and `pnpm typecheck` before opening pull requests. See `CONTRIBUTING.md` for contribution guidelines.
