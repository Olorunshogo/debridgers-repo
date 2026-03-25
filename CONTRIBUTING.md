# Contributing to Debridgers

This guide covers everything you need to work effectively in this repo — from setting up your environment to getting your PR merged.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)
- [Opening a Pull Request](#opening-a-pull-request)
- [Protected Branches](#protected-branches)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+
- pnpm 10+

```bash
npm install -g pnpm
```

---

## Setup

```bash
# Clone the repo
git clone git@github.com:debridger/debridgers-repo.git
cd debridgers-repo

# Install all workspace dependencies
pnpm install
```

---

## Branch Naming

push` via a pre-push hook. Pushes with invalid names are rejected automatically.

### Format

```
<prefix>/<short-description>
```

Use lowercase and hyphens. Keep the description short but meaningful.

### Allowed Prefixes

| Prefix     | When to use                                        |
| ---------- | -------------------------------------------------- |
| `feature`  | New functionality or capability                    |
| `fix`      | Bug fix                                            |
| `refactor` | Code restructure with no behavior change           |
| `hotfix`   | Urgent production fix                              |
| `release`  | Release preparation                                |
| `conflict` | Resolving a merge conflict                         |
| `chore`    | Maintenance — deps, config, tooling, docs, cleanup |

### Examples

```bash
git checkout -b feature/product-listing-page
git checkout -b fix/cart-total-calculation
git checkout -b chore/update-dependencies
git checkout -b refactor/simplify-auth-flow
git checkout -b hotfix/payment-crash-on-submit
```

> `main`, `develop`, and `live` are the only branches that don't need a prefix — and you should never push to them directly.

---

## Commit Messages

Write clear, imperative commit messages. Think: "this commit will..."

```
feat: add product search filter
fix: correct price calculation on checkout
chore: update pnpm lockfile
refactor: extract shared button component
docs: update README with alias setup
style: fix tailwind class ordering
```

Keep the subject line under 72 characters. Add a body if the change needs more context.

---

## Development Workflow

Every contribution follows this flow:

**1. Always start from the latest `develop`**

```bash
git checkout develop
git pull origin develop
```

**2. Create your branch**

```bash
git chee/your-feature-name
```

**3. Make your changes**

ME.md) for how the repo is structured and how to run things locally.

**4. Run quality checks before committing**

```bash
pnpm lint:fix   # fix lint issues
pnpm format     # format all files
pnpm test       # run tests
```

**5. Commit your changes**

```bash
git add .
git commit -m "feat: describe what you did"
```

Pre-commit hooks will automatically run Prettier and ESLint on staged files.

**6. Push your branch**

```bash
git push -u origin feature/your-feature-name
```

The pre-pus your branch name and run tests. If either fails, the push is aborted.

Request against `develop`\*\*

Go to GitHub and open a PR from your branch into `develop`. See [Opening a Pull Request](#opening-a-pull-request).

---

## Code Quality

This repo uses ESLint, Prettier, and Husky to keep code consistent.

```bash
# Check for lint issues
pnpm lint

# Fix lint issues automatically
pnpm lint:fix

# Format all files
pnpm format

# Run all tests
pnpm test
```

failing\*\*

Fix the failing tests locally before pushing:

```bash
pnpm test
```

**Merge conflicts with `develop`**

```bash
git checkout develop
git pull origin develop
git checkout your-branch
git merge develop
# resolve conflicts, then
git add .
git commit -m "conflict: resolve merge with develop"
git push
```

Rs only |

These branches represent production (`main`/`live`) and the integration branch (`develop`). All work flows through PRs into `develop`, and `develop` is promoted to `main`/`live` by the repo owner when ready.

**Never commit directly to `main`, `develop`, or `live`.**

---

## Troubleshooting

**Push rejected — invalid branch name**

Rename your branch to match the required format:

```bash
git branch -m old-name feature/new-name
git push -u origin feature/new-name
```

\*\*Push rejected — tests v6

```

---

## Protected Branches

| Branch    | Can you push directly? |
| --------- | ---------------------- |
| `main`    | No — restricted to repo owner only |
| `develop` | No — PRs only          |
| `live`    | No — Pommit.

---

## Opening a Pull Request

- Always target `develop` — never `main` or `live`
- Write a clear PR title that describes what changed
- Add a short description explaining the why, not just the what
- Keep PRs focused — one feature or fix per PR makes review easier
- Make sure all checks pass (lint, format, tests) before requesting review
- Request a review from at least one team member

### PR Title Format

```

feat: add product listing page
fix: correct cart total on quantity change
chore: upgrade vite to Pre-commit hooks run `eslint --fix` and `prettier --write` on staged `.ts`, `.tsx`, `.js`, `.jsx` files automatically when you c
