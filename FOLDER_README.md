# Debridgers Monorepo

Monorepo for Debridgers — a fresh foodstuff delivery platform serving Kaduna, Nigeria.

## 📁 Project Structure

```
debridgers-repo/
├── apps/
│   ├── debridgers-frontend/     # @debridgers/debridgers-frontend — React Router v7 SSR web app (landing, dashboard, auth)
│   └── debridgers-backend/      # @debridgers/debridgers-backend — NestJS API
├── packages/
│   ├── ui-web/                  # @debridgers/ui-web — shared web UI components
│   └── ui-app/                  # @debridgers/ui-app — shared app UI components
├── libs/
│   └── shared-theme/            # @debridgers/shared-theme — design tokens (tokens.css + index.ts)
├── docs/
│   └── jottings/                # Internal notes, task lists, theme docs
├── docker/                      # Docker Compose for local Postgres
└── scripts/                     # Utility scripts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 24.x
- pnpm 10.32.1+

### Installation

```bash
pnpm install
```

### Development

```bash
# Run frontend + backend together
pnpm dev

# Frontend only
pnpm dev:frontend

# Backend only
pnpm dev:backend

# ui-web package in watch mode (for component development)
pnpm watch:ui-web
```

---

## 📦 Apps

### `apps/debridgers-frontend` — `@debridgers/debridgers-frontend`

React Router v7 (SSR) web application. Contains:

- Landing page (`/`)
- Agents page (`/agents`)
- Contact page (`/contact`)
- Agent dashboard (`/agent-dashboard`)
- Auth pages (`/signup`, `/login`)

**Stack:** React Router v7, Tailwind v4, Framer Motion, Vite

```bash
pnpm dev:frontend        # Start dev server (port 3000)
pnpm build:frontend      # Production build
pnpm typecheck:frontend  # Type check
pnpm lint:frontend       # Lint
pnpm analyze             # Bundle analysis
```

---

### `apps/debridgers-backend` — `@debridgers/debridgers-backend`

NestJS REST API with Drizzle ORM and Postgres.

```bash
pnpm dev:backend         # Start dev server
pnpm build:backend       # Production build
pnpm typecheck:backend   # Type check
pnpm db:migrate          # Run migrations
pnpm db:generate         # Generate migration files
pnpm db:seed             # Seed database
```

---

## 🎨 Packages

### `packages/ui-web` — `@debridgers/ui-web`

Shared React web components used by `debridgers-frontend`.

```bash
pnpm dev:ui-web          # Watch mode
pnpm build:ui-web        # Build
```

### `libs/shared-theme` — `@debridgers/shared-theme`

Design tokens. Source of truth for colours, typography, and layout values.

- `src/tokens.css` — raw CSS variables
- `src/index.ts` — JS/TS colour exports

See `docs/jottings/TAILWIND_THEME.md` for full usage guide.

---

## 🛠️ Common Commands

```bash
pnpm dev                 # Run all apps concurrently
pnpm build               # Build all apps
pnpm lint                # Lint all apps
pnpm lint:fix            # Auto-fix lint issues
pnpm format              # Prettier format all files
pnpm typecheck           # Type check all apps
pnpm test                # Run all tests

# Database
pnpm docker:up           # Start local Postgres
pnpm docker:down         # Stop Postgres
pnpm docker:migrate      # Start Postgres + run migrations
```

---

## 🔧 Useful Filter Commands

```bash
# Type check frontend only
pnpm --filter @debridgers/debridgers-frontend typecheck 2>&1 | tail -40

# Check for TS errors only
pnpm --filter @debridgers/debridgers-frontend typecheck 2>&1 | grep -E "error TS|ERR_" | head -20
```

---

## � Docs

- `docs/jottings/TAILWIND_THEME.md` — Tailwind v4 token system, spacing, typography
- `docs/jottings/TASKS.md` — Pending tasks and optimisation notes
- `CONTRIBUTING.md` — Contribution guidelines
- `README.md` — Full project README
