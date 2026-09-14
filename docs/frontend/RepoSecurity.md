# Repo Security

Last verified against the codebase on 2026-09-14. Each verdict cites the file(s) checked so it can be re-verified directly.

## Fixed

- **Database SSL/TLS verification.** `rejectUnauthorized: true` with CA/cert/key from config, on by default outside `localhost`. `apps/debridgers-backend/src/infrastructure/database/database.provider.ts`.
- **File upload DoS protection.** 5MB limit, MIME allowlist, magic-byte signature check against spoofed extensions. `apps/debridgers-backend/src/infrastructure/file/file-validation.pipe.ts`.
- **Global input validation (mass assignment).** `ValidationPipe({ whitelist: true })` rejects unknown properties on every request. `apps/debridgers-backend/src/main.ts`.
- **Webhook replay attack protection.** Redis-based dedup service with a 24h idempotency cache, shared by both Paystack webhook handlers. `apps/debridgers-backend/src/infrastructure/redis` (webhook deduplication service).

## Now also fixed (were listed as remaining, no longer accurate)

- **Admin API key authentication.** Admins authenticate service-to-service calls via a hashed, prefixed API key (`Bearer <key>`) instead of JWT, validated per-request and never stored in plaintext. `apps/debridgers-backend/src/api/shared/guards/api-key.guard.ts`, `apps/debridgers-backend/src/api/v1/admin/admin-api-keys.service.ts`.
- **User suspension/blocking system.** `users.is_suspended` / `suspended_at` / `suspended_reason` columns, enforced at login (`assertAccountUsable`) and toggled by admin actions. `apps/debridgers-backend/src/infrastructure/persistence/schemas/users.schema.ts`, `apps/debridgers-backend/src/api/v1/auth/auth.service.ts:837`, `apps/debridgers-backend/src/api/v1/admin/admin.service.ts:935`.
- **Rate limiting on sensitive endpoints.** Global `ThrottlerGuard` plus per-route `@Throttle` limits on login, register, password reset, and verification. `apps/debridgers-backend/src/app/app.module.ts`, `apps/debridgers-backend/src/api/v1/auth/auth.controller.ts`, `apps/debridgers-backend/src/api/shared/throttle.config.ts`.
- **SQL injection risk in dynamic queries.** Every `sql\`...\``usage found interpolates values through Drizzle's tagged template (auto-parameterized), not raw string concatenation. No unparameterized dynamic query found across`agent.service.ts`, `ledger.service.ts`, `wallet.service.ts`, `careers-people.service.ts`, and others.
- **Weak password policies.** Zod rule requires 8+ characters, an uppercase letter, a digit, and a special character. `apps/debridgers-backend/src/api/v1/auth/dto/register.dto.ts`.
- **Missing request logging/audit trails.** `admin_audit_log` (general admin actions with actor, resource, before/after `details`, IP, user agent) plus `buyer_admin_logs` (suspend/unsuspend/verify/view actions on buyers). `apps/debridgers-backend/src/infrastructure/persistence/schemas/admin_audit_log.schema.ts`, `.../buyer_admin_logs.schema.ts`.
- **Insecure session management.** Refresh tokens are hashed at rest and rotated on use, with the old token invalidated so a stale token replay fails the match check. `apps/debridgers-backend/src/api/v1/auth/token-hash.ts`, `auth.service.ts` (`saveRefreshToken`, `refreshTokens`).
- **Missing content security headers.** Helmet is applied globally, with a real CSP (`default-src 'self'`, scoped `img-src`/`script-src`/`style-src`) active in production. `apps/debridgers-backend/src/main.ts`.
- **No API versioning strategy.** Global prefix `api/v1`, with a parallel `V2AppModule` already wired in alongside it. `apps/debridgers-backend/src/main.ts`, `apps/debridgers-backend/src/app/app.module.ts`.
- **Exposure of sensitive error details.** The global exception filter returns a generic message and omits the stack trace in production; only an explicit allow-listed `code` field is forwarded to clients. `apps/debridgers-backend/src/filters/http-exception.filter.ts`.
- **Missing access control on some endpoints.** Sampled agent, buyer, and admin controllers: role-restricted routes consistently carry `@UseGuards(AuthGuard, RolesGuard)` (admin routes additionally add `AdminKeyGuard`/`AdminDeskGuard`); the only unguarded agent routes are `apply` and `leaderboard`, which are public by design. `apps/debridgers-backend/src/api/v1/agent/agent.controller.ts`, `.../buyer/buyer.controller.ts`, `.../admin/admin.controller.ts`.

## Reclassified (not applicable to this architecture)

- **CSRF protection on state-changing operations.** Not applicable: every frontend authenticates via an explicit `Authorization: Bearer <token>` header set by JS, not an ambient session cookie a browser attaches automatically. A forged cross-site request cannot set that header, so there is no CSRF vector to protect against. `packages/api-client/src/apiFetch.ts`, `apps/debridgers-backend/src/api/shared/guards/auth.guard.ts`.
- **Weak TLS configuration defaults.** TLS termination is owned by the deploy layer (Cloudflare/nginx), not application code; there is no in-app TLS config to weaken beyond the already-fixed database SSL item above. Infra-owned, not a code fix.
- **Missing API authentication on public routes.** Mischaracterized in the original scan: routes like zones, categories, testimonials, and the outreach/newsletter forms are intentionally public. `apps/debridgers-backend/src/api/v1/public/public.controller.ts`.

## Still open

- **No encryption for sensitive data at rest.** Bank account numbers (`bank_account_number`, `bank_code`) are stored as plaintext columns; no field-level encryption exists, only Postgres/Neon's at-rest disk encryption. `apps/debridgers-backend/src/infrastructure/persistence/schemas/withdrawals.schema.ts`, `.../agent_profiles.schema.ts`.
- **No encryption for file uploads.** Uploads go to Cloudinary over HTTPS in transit; no additional encryption-at-rest step is applied by this codebase.
- **Insufficient input sanitization on search.** Not re-verified in detail this pass beyond confirming query params flow through Drizzle's parameterized builder; worth a dedicated review of search/filter endpoints specifically.
- **No rate limiting on public endpoints.** Confirmed still true, and broader than the original note: public routes (including mutating ones like `cart/stage` and `outreach/submit`) carry `@SkipThrottle`, so they have no throttling at all rather than a looser limit. `apps/debridgers-backend/src/api/v1/public/public.controller.ts`.
- **Missing security headers documentation.** No dedicated doc found; headers themselves are set (see Helmet above) but undocumented for other engineers.
- **No security.txt file.** No `/.well-known/security.txt` found in any app's `public/` directory.
