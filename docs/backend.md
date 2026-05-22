# Debridgers Backend - Architecture & Structure

## Overview

The Debridgers backend is a **NestJS** application following a modular architecture. It uses **Drizzle ORM** for type-safe database access against a **Neon (PostgreSQL)** database, **Mailtrap** for transactional email, and **Paystack** for payment splitting.

All responses are wrapped by a global interceptor:

```json
{
  "statusCode": 200,
  "message": "Description of result",
  "data": {},
  "timestamp": "2026-04-02T10:00:00.000Z",
  "version": "v1",
  "path": "/api/v1/route"
}
```

**Swagger UI:** `http://localhost:4000/api/docs`

---

## Folder Structure

```
apps/debridgers-backend/
├── src/
│   ├── main.ts                          # Entry point - CORS, versioning, Swagger, global interceptor
│   ├── app/                             # Feature modules
│   │   ├── app.module.ts                # Root module
│   │   ├── app.controller.ts            # GET /health
│   │   ├── auth/                        # Auth for all user types
│   │   │   ├── auth.controller.ts       # POST /auth/register|login|refresh|logout|forgot|reset
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts        # Validates Bearer JWT
│   │   │   │   ├── roles.guard.ts       # Checks @Roles() metadata
│   │   │   │   └── refresh.guard.ts     # Validates Refresh token
│   │   │   └── decorators/
│   │   │       ├── current-user.decorator.ts
│   │   │       └── roles.decorator.ts
│   │   ├── agent/                       # Agent lifecycle
│   │   │   ├── agent.controller.ts      # /agent/* routes
│   │   │   ├── agent.service.ts         # apply, profile, reports, commissions
│   │   │   ├── wallet.service.ts        # credit, debit, getWallet
│   │   │   ├── stock.service.ts         # requestStock, remitStock (KYC-gated)
│   │   │   ├── kyc.service.ts           # submitKyc, getKycStatus
│   │   │   └── dto/
│   │   │       ├── apply-agent.dto.ts
│   │   │       ├── submit-report.dto.ts
│   │   │       ├── stock-request.dto.ts
│   │   │       ├── remit-stock.dto.ts
│   │   │       └── submit-kyc.dto.ts
│   │   ├── admin/                       # Admin dashboard
│   │   │   ├── admin.controller.ts      # /admin/* routes (role-guarded)
│   │   │   ├── admin.service.ts
│   │   │   └── dto/
│   │   │       ├── update-agent-status.dto.ts
│   │   │       ├── promote-manager.dto.ts
│   │   │       ├── record-inventory.dto.ts
│   │   │       └── review-kyc.dto.ts
│   │   ├── commission/                  # Monthly cron commission calculation
│   │   │   ├── commission.module.ts
│   │   │   └── commission.service.ts    # @Cron - runs 1st of each month
│   │   ├── contact/                     # Landing page lead capture
│   │   │   └── contact.controller.ts    # POST /contact
│   │   └── payment/                     # Paystack split payment
│   │       └── payment.controller.ts    # POST /payment/initialize|webhook|subaccount
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── database.provider.ts     # Drizzle + pg → Neon connection
│   │   ├── persistence/
│   │   │   ├── index.ts                 # Barrel export of all schemas
│   │   │   ├── schemas/                 # 16 Drizzle table definitions
│   │   │   └── migrations/              # Auto-generated SQL
│   │   ├── pipeline/
│   │   │   └── validation.pipeline.ts   # ZodValidationPipe
│   │   └── seeders/
│   │       └── seeder.ts                # Seeds default admin account
│   │
│   ├── notification/
│   │   └── features/email/email.service.ts  # Mailtrap transactional emails
│   │
│   ├── events/
│   │   ├── event-types/user.event.types.ts
│   │   └── listeners/user-listeners.ts  # @OnEvent handlers → async emails
│   │
│   └── interceptors/
│       └── api-response.interceptor.ts  # Wraps all responses in standard format
│
├── drizzle.config.ts
└── package.json
```

---

## Database Schema (16 Tables)

| Table                | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `users`              | All user types: `admin \| agent \| buyer \| company`                       |
| `agent_profiles`     | Agent data: KYC status, referral codes, bank details, state manager flag   |
| `wallets`            | Agent wallet - available + pending balance (in kobo)                       |
| `stock_requests`     | Agent stock requests + remittance tracking                                 |
| `inventory_records`  | Admin records of stock received from supplier                              |
| `commissions`        | Per-order commissions: direct, buyer_referral, agent_override, sm_override |
| `orders`             | Buyer orders placed through agents                                         |
| `leads`              | Contact form submissions                                                   |
| `sales_reports`      | Legacy agent sales submissions                                             |
| `zones`              | Delivery zones mapped to LGAs                                              |
| `riders`             | Delivery riders attached to zones                                          |
| `withdrawals`        | Agent withdrawal requests from wallet                                      |
| `campaigns`          | Mailtrap email campaigns                                                   |
| `audit_log`          | Admin action log                                                           |
| `email_verification` | OTP tokens                                                                 |
| `password_resets`    | Password reset tokens                                                      |

---

## Environment Variables

| Variable               | Description                        |
| ---------------------- | ---------------------------------- |
| `DATABASE_URL`         | Neon PostgreSQL connection string  |
| `ACCESS_TOKEN_SECRET`  | JWT access token signing key       |
| `ACCESS_TOKEN_EXPIRY`  | Access token TTL (default: `15m`)  |
| `REFRESH_TOKEN_SECRET` | JWT refresh token signing key      |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL (default: `7d`)  |
| `MAILTRAP_TOKEN`       | Mailtrap API token                 |
| `MAILTRAP_FROM_EMAIL`  | From email address                 |
| `PAYSTACK_SECRET_KEY`  | Paystack secret key                |
| `PAYSTACK_PUBLIC_KEY`  | Paystack public key                |
| `ADMIN_EMAIL`          | Seed admin email                   |
| `ADMIN_PASSWORD`       | Seed admin password                |
| `APP_URL`              | Frontend URL (used in email links) |

---

## Local Development Setup (Docker Postgres)

The backend uses PostgreSQL. For local development, a Docker container replaces any need for a hosted DB (Neon, Supabase, etc.).

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- Node.js 24+ and pnpm 10+

### First-time setup

Run these once when setting up the project for the first time:

**1. Copy and fill in the backend env file**

```bash
cp apps/debridgers-backend/.env.example apps/debridgers-backend/.env
```

The example already has `DATABASE_URL` set to the local Docker Postgres connection string. Fill in the remaining required variables:

- **JWT secrets** - generate strong random strings for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`
- **Cloudinary** - get credentials from your Cloudinary dashboard
- **Mailtrap** - get your API token from Mailtrap
- **Paystack** - get your secret and public keys from Paystack
- **Admin seed** - set `ADMIN_PASSWORD` (email defaults to `admin@debridgers.com`)

Optional:

- **Redis** - set `UPSTASH_REDIS_URL` if you want persistent caching (otherwise uses in-memory)
- **App URL** - defaults to `http://localhost:3000`, change if your frontend runs elsewhere

**2. Start Postgres and run migrations**

```bash
pnpm docker:migrate
```

This does two things in sequence:

- Starts the Postgres container and waits until it passes its healthcheck
- Runs all Drizzle migrations against it

**3. Seed the admin account**

```bash
pnpm db:seed
```

Creates the default admin user (`admin@debridgers.com` / `Admin@2026!` unless overridden by `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`). Safe to skip if you don't need the seed data.

**4. Start the backend**

```bash
pnpm dev:backend
```

Backend is now running at `http://localhost:4000/api/v1`.
Swagger UI at `http://localhost:4000/api/docs`.

---

### Day-to-day workflow

On subsequent runs, Postgres persists data in a named Docker volume; you only need to start the container:

```bash
pnpm docker:up      # Start

---

## How a Request Flows

```

Client → PATCH /api/v1/admin/agents/5/status
↓
AuthGuard - verifies Bearer JWT
↓
RolesGuard - checks role === 'admin'
↓
ZodValidationPipe (on @Body) - validates { status: "approved" }
↓
AdminService.updateAgentStatus() - generates referral codes, creates wallet
↓
EventEmitter2.emit('agent.approved', payload) ← async, non-blocki-------------------------- |
| `pnpm docker:up` | Start the Postgres container in the background, wait for healthcheck |
| `pnpm docker:down` | Stop and remove the Postgres container (data volume is preserved) |
| `pnpm docker:migrate` | `docker:up` + `db:migrate` in one step |

To also remove the data volume (full reset):

```bash
docker compose -p debridgers -f docker/docker-compose.yml down -v
```

---

### Switching between local Docker and a hosted DB (Neon/Supabase)

Just swap `DATABASE_URL` in `apps/debridgers-backend/.env`:

```env
# Local Docker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/debridgers

# Hosted (Neon example)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/debridgers?sslmode=require
```

SSL is handled automatically: the database provider and seeder detect `localhost`/`127.0.0.1` and disable SSL for local connections.

---

## Scripts

```bash
pnpm dev:backend   # Start backend with hot reload
pnpm build:backend # Compile to dist/
pnpm start:backend # Run compiled dist/main.js
pnpm db:generate   # Generate migration SQL from schema changes
pnpm db:migrate    # Apply migrations to the database
pnpm db:studio     # Open Drizzle Studio (visual DB browser)
pnpm db:seed       # Seed admin account (run once on new DB)
pnpm docker:up     # Start local Postgres container
pnpm docker:down   # Stop local Postgres container
pnpm docker:migrate # Start Postgres + run migrations in one step
```

From repo root:

````bash
pnpm dev           # Start backend + frontend together (concurrently)
pnpm test:e2e      # Run backend e2e tests
```ng
  ↓ (background)
UserListeners.onAgentApproved() → EmailService.sendAgentApproved()
  ↓
ApiResponseInterceptor - wraps result in standard JSON envelope
  ↓
Client ← 200 OK { statusCode, message, data, timestamp, path }
````

---

## Agent Lifecycle

```
1. Agent applies          → POST /agent/apply (public, multipart)
2. Login denied           → POST /auth/login returns 401 "not yet approved"
3. Admin approves         → PATCH /admin/agents/:id/status { status: "approved" }
                             ↳ referral codes generated (BUYER-XXXX, AGENT-XXXX)
                             ↳ wallet created
                             ↳ approval email sent
4. Agent logs in          → POST /auth/login ✓
5. Agent submits KYC      → POST /agent/kyc (multipart: id_front + id_selfie)
6. Admin reviews KYC      → PATCH /admin/agents/:id/kyc { action: "approved" }
7. Agent requests stock   → POST /agent/stock/request (KYC-gated)
8. Admin fulfils stock    → PATCH /admin/stock/requests/:id/fulfil
9. Agent remits payment   → POST /agent/stock/remit
10. Commissions calculated → @Cron runs 1st of each month
11. Admin marks paid      → PATCH /admin/commissions/:id/paid
```

---

## E2E Tests

```
apps/debridgers-backend-e2e/src/debridgers-backend/
├── health.spec.ts    # GET /health
├── contact.spec.ts   # POST /contact
├── auth.spec.ts      # register → login → wrong password
├── admin.spec.ts     # dashboard, agents, buyers, stock, inventory, leads
└── agent.spec.ts     # full flow: apply → approve → KYC → stock request
```

Run against live server (default `http://localhost:4000`):

```bash
cd apps/debridgers-backend-e2e && pnpm test
```

---

## Swagger

Swagger UI auto-generates interactive API documentation from the controllers.

**URL:** `http://localhost:4000/api/docs`

- Click **Authorize** (top right) and paste your Bearer token to test protected routes
- All endpoints, request bodies, and response shapes are visible
- The `persistAuthorization` option keeps your token across page refreshes
