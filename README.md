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

/debridgers-repo$ tree -L 2
.
├── api
│ └── index.ts
├── apps
│ ├── backend
│ ├── debridgers-backend
│ ├── debridgers-backend-e2e
│ └── landing-page
├── CONTRIBUTING.md
├── docker
│ ├── backend.Dockerfile
│ ├── docker-compose.yml
│ └── landing.Dockerfile
├── docs
│ ├── admin.md
│ ├── agent.md
│ ├── auth.md
│ └── backend.md
├── eslint.config.mjs
├── FOLDER*README.md
├── libs
│ ├── shared-theme
│ └── shared-utils
├── node_modules
│ ├── concurrently -> .pnpm/concurrently@8.2.2/node_modules/concurrently
│ ├── eslint -> .pnpm/eslint@9.39.4_jiti@2.6.1/node_modules/eslint
│ ├── eslint-config-prettier -> .pnpm/eslint-config-prettier@10.1.8_eslint@9.39.4_jiti@2.6.1*/node*modules/eslint-config-prettier
│ ├── eslint-plugin-import -> .pnpm/eslint-plugin-import@2.32.0*@typescript-eslint+parser@8.57.2_eslint@9.39.4_jiti@2.6.1___8d89b0808ebd343afc22e31708bf2958/node*modules/eslint-plugin-import
│ ├── eslint-plugin-prettier -> .pnpm/eslint-plugin-prettier@5.5.5*@types+eslint@9.6.1_eslint-config-prettier@10.1.8*eslint@9_301f51fcc56ebabbd6430d59d9f660b6/node_modules/eslint-plugin-prettier
│ ├── eslint-plugin-react -> .pnpm/eslint-plugin-react@7.37.5_eslint@9.39.4_jiti@2.6.1*/node*modules/eslint-plugin-react
│ ├── eslint-plugin-react-hooks -> .pnpm/eslint-plugin-react-hooks@5.2.0_eslint@9.39.4_jiti@2.6.1*/node*modules/eslint-plugin-react-hooks
│ ├── husky -> .pnpm/husky@9.1.7/node_modules/husky
│ ├── lint-staged -> .pnpm/lint-staged@16.4.0/node_modules/lint-staged
│ ├── prettier -> .pnpm/prettier@3.8.1/node_modules/prettier
│ ├── prettier-plugin-tailwindcss -> .pnpm/prettier-plugin-tailwindcss@0.7.2_prettier@3.8.1/node_modules/prettier-plugin-tailwindcss
│ ├── tsup -> .pnpm/tsup@8.5.1_jiti@2.6.1_postcss@8.5.8_tsx@4.21.0_typescript@5.9.3_yaml@2.8.3/node_modules/tsup
│ ├── typescript -> .pnpm/typescript@5.9.3/node_modules/typescript
│ ├── @typescript-eslint
│ ├── vite -> .pnpm/vite@5.4.21*@types+node@22.19.15_lightningcss@1.32.0_terser@5.46.1/node*modules/vite
│ └── vitest -> .pnpm/vitest@1.6.1*@types+node@22.19.15_lightningcss@1.32.0_terser@5.46.1/node_modules/vitest
├── package.json
├── packages
│ ├── api-client
│ ├── ui-app
│ └── ui-web
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prettier.config.cjs
├── README.md
├── scripts
│ └── GENERATE_SCRIPTS.md
├── TAILWIND_THEME.md
├── TASKS.md
├── tsconfig.base.json
├── tsconfig.json
└── vitest.workspace.ts

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
