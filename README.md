# Debridgers Monorepo

A pnpm monorepo for the Debridgers platform — housing the web app, backend, and shared component libraries.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Apps](#apps)
- [Packages](#packages)
- [Libs](#libs)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Import Aliases](#import-aliases)
- [Adding a New App](#adding-a-new-app)
- [Adding a New Package / Library](#adding-a-new-package--library)
- [Code Quality](#code-quality)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Project Structure

```
debridgers-repo/
├── apps/
│   ├── landing-page/        # React Router v7 SSR web app (@debridgers/landing-page)
│   └── backend/             # Node.js backend
├── packages/
│   ├── ui-web/              # @debridgers/ui-web — Shadcn-style web components
│   └── ui-app/              # @debridgers/ui-app — Mobile/Ionic-style components
├── libs/
│   ├── shared-theme/        # @debridgers/shared-theme — Tailwind CSS preset
│   └── shared-utils/        # @debridgers/shared-utils — Shared utility functions
├── docker/                  # Dockerfiles and docker-compose
├── scripts/                 # Utility scripts
├── package.json             # Root workspace config
└── pnpm-workspace.yaml      # pnpm workspace definition
```

---

## Apps

### `apps/landing-page` — `@debridgers/landing-page`

The main web application. Built with React Router v7 (SSR), Tailwind CSS v4, and TypeScript.

- Entry: `app/routes.ts`
- Root layout: `app/root.tsx`
- SSR handler: `entry.server.tsx`
- Client hydration: `app/entry.client.tsx`

```bash
# Dev server (port 3000)
pnpm dev-landing-page

# Build
pnpm build-landing-page

# Start production server
pnpm --filter @debridgers/landing-page start
```

### `apps/backend`

Node.js backend service.

```bash
pnpm dev-backend
pnpm build-backend
```

---

## Packages

Packages are buildable with `tsup` and consumed via workspace aliases.

### `packages/ui-web` — `@debridgers/ui-web`

Shadcn-style web components (Radix UI + Tailwind). Used in web apps.

```tsx
import { Button } from "@debridgers/ui-web";
```

```bash
pnpm dev-ui-web     # watch mode
pnpm build-ui-web   # build dist/
```

### `packages/ui-app` — `@debridgers/ui-app`

Mobile-optimized components for Ionic/Capacitor apps.

```tsx
import { MobileButton } from "@debridgers/ui-app";
```

```bash
pnpm --filter @debridgers/ui-app dev    # watch mode
pnpm --filter @debridgers/ui-app build  # build dist/
```

> Note: In `apps/landing-page`, both packages are aliased directly to their `src/` in Vite — so you don't need to build them during development. See [Import Aliases](#import-aliases).

---

## Libs

### `libs/shared-theme` — `@debridgers/shared-theme`

Centralized Tailwind CSS preset with shared design tokens (colors, etc.).

```ts
// tailwind.config.ts
import preset from "@debridgers/shared-theme";

export default {
  presets: [preset],
  content: ["./app/**/*.{ts,tsx}"],
};
```

### `libs/shared-utils` — `@debridgers/shared-utils`

Shared utility functions.

```ts
import { cn } from "@debridgers/shared-utils";
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+

```bash
# Install pnpm if needed
npm install -g pnpm
```

### Install

```bash
pnpm install
```

### Run the landing page in dev

```bash
pnpm dev-landing-page
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development Workflow

### Working on UI packages without rebuilding

The `landing-page` Vite config aliases `@debridgers/ui-web` and `@debridgers/ui-app` directly to their `src/` directories. This means changes to components are picked up instantly via HMR — no need to run `tsup --watch` separately.

### Working on packages for other consumers

If you're building a new app that consumes packages via their built `dist/`, run watch mode:

```bash
pnpm --filter @debridgers/ui-web dev
pnpm --filter @debridgers/ui-app dev
```

---

## Import Aliases

Configured in `apps/landing-page/vite.config.ts` and `tsconfig.json`:

| Alias                | Resolves to               |
| -------------------- | ------------------------- |
| `@/*`                | `apps/landing-page/app/*` |
| `@debridgers/ui-web` | `packages/ui-web/src`     |
| `@debridgers/ui-app` | `packages/ui-app/src`     |

Usage:

```tsx
import { Button } from "@debridgers/ui-web";
import { MobileButton } from "@debridgers/ui-app";
import { MyComponent } from "@/components/my-component";
```

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

## Code Quality

```bash
# Lint all
pnpm lint

# Lint + autofix all
pnpm lint:fix

# Format all
pnpm format
```

Pre-commit hooks (Husky + lint-staged) run Prettier and ESLint on staged files automatically.

---

## Building for Production

```bash
# Build everything
pnpm build

# Build specific app
pnpm build-landing-page
pnpm build-backend
```

Docker support is available in `docker/`:

```bash
docker compose -f docker/docker-compose.yml up
```

---

## Troubleshooting

**Clean the pnpm store (remove unreferenced/cached packages)**

```bash
pnpm store prune
```

**Hard reset the pnpm store entirely**

```bash
pnpm store clear
```

**Module not found for a workspace package**d lockfile, then reinstall)\*\*

```bash
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name "node_modules" -type d -not -path "*/.git/*" | xargs rm -rf

find . -name "pnpm-lock.yaml" -type f -delete
pnpm install
```

**Module not found for a workspace package**
Make sure the package has been built if it's consumed via `dist/`:

```bash
pnpm --filter @debridgers/ui-web build
```

**Type errors on `@debridgers/ui-web` or `@debridgers/ui-app`**
Check that `tsconfig.json` paths are set correctly in the consuming app. See `apps/landing-page/tsconfig.json` for reference.

**Port already in use**
The landing page dev server runs on port 3000. Kill the existing process or change `server.port` in `vite.config.ts`.
