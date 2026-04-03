# Debridgers Backend — Architecture & Structure

## Overview

The Debridgers backend is a **NestJS** application following a modular architecture inspired by enterprise-grade patterns. It uses **Drizzle ORM** for type-safe database access against a **Neon (PostgreSQL)** database, **Upstash Redis** for caching, **Mailtrap** for email, and **Paystack** for payment splitting.

All responses are wrapped by a global interceptor in the standard format:

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

---

## Folder Structure

```
apps/debridgers-backend/
├── src/
│   ├── main.ts                          # Entry point — CORS, versioning, global interceptor
│   ├── app/                             # Feature modules (business logic)
│   │   ├── app.module.ts                # Root module — registers everything
│   │   ├── app.controller.ts            # GET /health
│   │   ├── app.service.ts
│   │   ├── auth/                        # Auth for ALL user types (agent, buyer, company, admin)
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts       # POST /auth/register|login|refresh|logout|forgot|reset
│   │   │   ├── auth.service.ts
│   │   │   ├── config/
│   │   │   │   ├── access-jwt.ts        # ACCESS_TOKEN_SECRET + expiry config
│   │   │   │   └── refresh-jwt.ts       # REFRESH_TOKEN_SECRET + expiry config
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts   # @CurrentUser() param decorator
│   │   │   │   └── roles.decorator.ts          # @Roles('admin', 'agent') metadata decorator
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts        # Validates Bearer JWT on protected routes
│   │   │   │   ├── roles.guard.ts       # Checks user role against @Roles() metadata
│   │   │   │   └── refresh.guard.ts     # Validates Refresh token for token rotation
│   │   │   └── dto/
│   │   │       ├── register.dto.ts      # Zod schema + type for registration
│   │   │       ├── login.dto.ts
│   │   │       ├── forgot-password.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   ├── contact/                     # Lead capture from landing page contact form
│   │   │   ├── contact.module.ts
│   │   │   ├── contact.controller.ts    # POST /contact
│   │   │   ├── contact.service.ts
│   │   │   └── dto/create-contact.dto.ts
│   │   ├── agent/                       # Agent application, dashboard, reports
│   │   │   ├── agent.module.ts
│   │   │   ├── agent.controller.ts      # POST /agent/apply | GET /agent/me | reports
│   │   │   ├── agent.service.ts
│   │   │   └── dto/
│   │   │       ├── apply-agent.dto.ts
│   │   │       └── submit-report.dto.ts
│   │   ├── admin/                       # Admin management dashboard
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts      # All /admin/* routes (role-guarded)
│   │   │   ├── admin.service.ts
│   │   │   └── dto/update-agent-status.dto.ts
│   │   └── payment/                     # Paystack split payment
│   │       ├── payment.module.ts
│   │       ├── payment.controller.ts    # POST /payment/initialize|webhook|subaccount
│   │       ├── payment.service.ts
│   │       └── dto/initialize-payment.dto.ts
│   │
│   ├── infrastructure/                  # Technical plumbing (not business logic)
│   │   ├── config/                      # registerAs() config factories
│   │   │   ├── database.config.ts       # DATABASE_URL
│   │   │   ├── jwt.config.ts            # JWT secrets + expiry
│   │   │   ├── cloudinary.config.ts     # CV file uploads
│   │   │   ├── paystack.config.ts       # Paystack keys + commission rate
│   │   │   └── mailtrap.config.ts       # Email service config
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   └── database.provider.ts     # Drizzle + pg Pool → Neon connection
│   │   ├── persistence/
│   │   │   ├── index.ts                 # Barrel export of all schemas
│   │   │   ├── schemas/
│   │   │   │   ├── users.schema.ts          # All users: admin | agent | buyer | company
│   │   │   │   ├── agent_profiles.schema.ts # CV, target, status, subaccount code
│   │   │   │   ├── leads.schema.ts          # Contact form submissions
│   │   │   │   ├── sales_reports.schema.ts  # Agent sales submissions
│   │   │   │   ├── commissions.schema.ts    # Per-sale commission records (30%)
│   │   │   │   ├── email_verification.schema.ts
│   │   │   │   └── password_resets.schema.ts
│   │   │   └── migrations/              # Auto-generated SQL (drizzle-kit generate)
│   │   ├── redis/
│   │   │   ├── core/
│   │   │   │   ├── redis.module.ts      # Global module — available everywhere
│   │   │   │   └── redis.provider.ts    # Upstash connection with in-memory fallback
│   │   │   └── features/
│   │   │       └── redis.service.ts     # get / set / del / has
│   │   ├── logger/
│   │   │   └── logger.module.ts         # Pino logger — dev: pretty print, prod: file rotation
│   │   ├── helper/
│   │   │   └── column.helper.ts         # Shared created_at / updated_at / deleted_at columns
│   │   ├── pipeline/
│   │   │   └── validation.pipeline.ts   # ZodValidationPipe — rejects invalid request bodies
│   │   └── seeders/
│   │       └── seeder.ts                # Seeds default admin account (run once)
│   │
│   ├── notification/
│   │   ├── core/email/email.service.ts  # Raw Mailtrap sender (CoreEmailService)
│   │   └── features/email/
│   │       ├── email.module.ts
│   │       └── email.service.ts         # Business emails: welcome, approval, rejection, reset
│   │
│   ├── events/
│   │   ├── event-types/user.event.types.ts  # Event name constants + payload types
│   │   └── listeners/user-listeners.ts      # @OnEvent handlers → trigger emails async
│   │
│   ├── interceptors/
│   │   └── api-response.interceptor.ts  # Wraps all responses in standard format
│   │
│   └── interfaces/users/
│       ├── jwt.type.ts                  # JwtPayload interface
│       └── roles.type.ts                # UserRole type: admin | agent | buyer | company
│
├── drizzle.config.ts                    # Drizzle CLI — schema path + migration output
├── nest-cli.json                        # NestJS CLI config
├── tsconfig.json                        # CommonJS, emitDecoratorMetadata: true
├── .env                                 # Environment variables (never commit)
└── package.json
```

---

## How a Request Flows

```
Client → POST /api/v1/agent/apply
  ↓
NestJS Router (AgentController)
  ↓
ZodValidationPipe — validates request body against applyAgentSchema
  ↓
AgentService.apply() — business logic
  ↓
Drizzle ORM → Neon PostgreSQL (inserts users + agent_profiles)
  ↓
EventEmitter2.emit('agent.applied', payload)       ← async, non-blocking
  ↓ (background)
UserListeners.onAgentApplied() → EmailService.sendAgentApplicationReceived()
  ↓
ApiResponseInterceptor — wraps result in standard JSON envelope
  ↓
Client ← 201 Created { statusCode, message, data, timestamp, path }
```

---

## Database Schema

| Table                | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `users`              | Single table for all user types. `role` enum: `admin \| agent \| buyer \| company` |
| `agent_profiles`     | Agent-specific data: CV URL, address, NIN, status, target, Paystack subaccount     |
| `leads`              | Contact form submissions (name + email + message)                                  |
| `sales_reports`      | Agent sales submissions (pages sold + amount)                                      |
| `commissions`        | Per-report commission record (30% of sale amount)                                  |
| `email_verification` | OTP tokens for email verification                                                  |
| `password_resets`    | Tokens for password reset flow                                                     |

---

## Environment Variables

| Variable                | Description                                   |
| ----------------------- | --------------------------------------------- |
| `DATABASE_URL`          | Neon PostgreSQL connection string             |
| `ACCESS_TOKEN_SECRET`   | JWT access token signing key                  |
| `ACCESS_TOKEN_EXPIRY`   | Access token TTL (default: `15m`)             |
| `REFRESH_TOKEN_SECRET`  | JWT refresh token signing key                 |
| `REFRESH_TOKEN_EXPIRY`  | Refresh token TTL (default: `7d`)             |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name                       |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                            |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                         |
| `UPSTASH_REDIS_URL`     | Upstash Redis connection URL (`rediss://...`) |
| `MAILTRAP_TOKEN`        | Mailtrap API token                            |
| `MAILTRAP_FROM_EMAIL`   | From email address                            |
| `PAYSTACK_SECRET_KEY`   | Paystack secret key                           |
| `PAYSTACK_PUBLIC_KEY`   | Paystack public key                           |
| `AGENT_COMMISSION_RATE` | Agent commission rate (default: `0.30` = 30%) |
| `ADMIN_EMAIL`           | Seed admin email                              |
| `ADMIN_PASSWORD`        | Seed admin password                           |
| `APP_URL`               | Frontend URL (used in email links)            |

---

## Scripts

```bash
pnpm dev           # Start with hot reload (nest start --watch)
pnpm build         # Compile to dist/
pnpm start         # Run compiled dist/main.js
pnpm db:generate   # Generate migration SQL from schema changes
pnpm db:migrate    # Apply migrations to Neon
pnpm db:studio     # Open Drizzle Studio (visual DB browser)
pnpm db:seed       # Seed admin account (run once on new DB)
```

---

## E2E Test Structure (`apps/debridgers-backend-e2e/`)

```
apps/debridgers-backend-e2e/
├── src/
│   ├── support/
│   │   └── global-setup.ts              # Sets NODE_ENV=test before all tests
│   └── debridgers-backend/
│       ├── health.spec.ts               # GET /health → 200 ok
│       ├── contact.spec.ts              # POST /contact → save lead, validate input
│       ├── auth.spec.ts                 # register → login → wrong password = 401
│       ├── admin.spec.ts                # Admin login → dashboard → agents → leads
│       └── agent.spec.ts                # POST /agent/apply with form data
├── jest.config.ts
├── tsconfig.json
└── package.json
```

### Running E2E Tests

```bash
# Start the backend first
pnpm --filter @debridgers/debridgers-backend dev

# In a second terminal
pnpm test:e2e
# OR directly
cd apps/debridgers-backend-e2e && pnpm test
```

E2E tests run against a live server (default: `http://localhost:4000`). Set `API_URL` env var to point at a deployed instance.

---

## Adding New Features

Follow the module pattern. For a new `buyer` feature:

```bash
# 1. Create the folder
mkdir -p apps/debridgers-backend/src/app/buyer/dto

# 2. Create module, controller, service, dto (follow agent/ as template)

# 3. Register in app.module.ts
import { BuyerModule } from './buyer/buyer.module';
// add BuyerModule to imports: []

# 4. Add 'buyer' to userRoleEnum in users.schema.ts (already there)
# 5. Generate + run migration: pnpm db:generate && pnpm db:migrate
```
