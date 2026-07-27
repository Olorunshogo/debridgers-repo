# Email Addresses

Inventory of every email address referenced across the repo, so we do not have to rescan. Grouped by whether it needs a real mailbox, is a placeholder, or is a personal account to review.

Last scanned: 2026-07-23

## 1. Real `@debridgers.com` addresses (create these mailboxes)

| Address                  | Purpose                                                                        | Where it lives                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `support@debridgers.com` | Customer/user support. Shown to users and used in transactional email footers. | `apps/debridgers-frontend/app/routes/landing/contact.tsx:115,116,296`<br>`apps/debridgers-frontend/app/components/landing/Footer.tsx:121,124`<br>`apps/debridgers-backend/src/notification/features/email/email.service.ts:60,356,598`                                                                         |
| `partner@debridgers.com` | Partnership inquiries.                                                         | `apps/debridgers-frontend/app/components/landing/Footer.tsx:127,130`                                                                                                                                                                                                                                           |
| `noreply@debridgers.com` | Outbound "from" address for system/transactional mail.                         | `apps/debridgers-backend/.env.example:23` (default)<br>`apps/debridgers-backend/src/infrastructure/config/mailtrap.config.ts:5` (fallback)<br>`apps/debridgers-backend/src/notification/core/email/email.service.ts:33` (fallback)                                                                             |
| `admin@debridgers.com`   | Seeded admin account login.                                                    | `apps/debridgers-backend/.env.example:44` (default)<br>`apps/debridgers-backend/src/infrastructure/seeders/seeder.ts:158` (fallback)<br>`apps/debridgers-backend/src/app/auth/auth.service.ts:446` (fallback)<br>e2e tests: `admin.spec.ts:2`, `agent.spec.ts:2`, `buyer.spec.ts:2`, `benchmark.spec.ts:18,26` |

### Env-driven addresses

`noreply@debridgers.com` and `admin@debridgers.com` are configured through env vars. Set these in the real `.env`; the hardcoded values are only fallbacks.

| Env var               | Consumes              | Default fallback         |
| --------------------- | --------------------- | ------------------------ |
| `MAILTRAP_FROM_EMAIL` | Outbound from-address | `noreply@debridgers.com` |
| `ADMIN_EMAIL`         | Seeded admin login    | `admin@debridgers.com`   |

## 2. Placeholders and examples (no action needed)

- **Swagger `example:` values** (sample docs data): `chukwudi@example.com`, `amina@example.com`, `ngozi@example.com`, `fatima@example.com`
  - `apps/debridgers-backend/src/app/auth/auth.controller.ts`
  - `apps/debridgers-backend/src/app/admin/admin.controller.ts`
  - `apps/debridgers-backend/src/app/agent/agent.controller.ts`
  - `apps/debridgers-backend/src/app/contact/contact.controller.ts`
- **Form input placeholders** `you@example.com`:
  - `apps/debridgers-frontend/app/routes/auth/login.tsx:145`
  - `apps/debridgers-frontend/app/routes/auth/forgot-password.tsx:262`
  - `apps/debridgers-frontend/app/routes/auth/signup.tsx:398,471`
  - `apps/debridgers-frontend/app/components/auth/AuthModal.tsx:195,282`
- **Test fixtures** `nobody@bench.test`:
  - `apps/debridgers-backend-e2e/src/debridgers-backend/benchmark.spec.ts:209,222`

## 3. Personal Gmail addresses (review before shipping)

Real personal accounts sitting in tracked files.

- `docs/jottings/CREDENTIALS.md:3-6` test-account credentials committed to the repo:
  - `reeach.olorunshogo@gmail.com` (Buyer)
  - `0x0dgp@gmail.com`
  - `yusiomone@gmail.com` (Agent)
- `libs/shared-utils/src/actions/contactForm.ts:28-29` commented-out sample data:
  - `shownzy001@gmail.com`
  - `bamtefaolorunshogo12@gmail.com`

Warning: `docs/jottings/CREDENTIALS.md` holds real credentials in git history. Consider untracking and gitignoring it, and scrubbing the commented Gmail addresses from `contactForm.ts`.

## Summary: mailboxes to create

`support@`, `partner@`, `noreply@`, and `admin@` at `debridgers.com`.
