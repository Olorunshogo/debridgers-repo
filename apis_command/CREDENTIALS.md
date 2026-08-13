# Auth Test Credentials and Results

Live run against `http://localhost:4001/api/v1` on 2026-08-08.
Scope: auth module only (`01-auth.sh`). Agent flow deliberately excluded.

## Accounts

### Buyer (primary)

| Field                  | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| user id                | 137                                                                                    |
| email                  | `lofow79095@murkstar.com`                                                              |
| password               | `ResetRevoke@789`                                                                      |
| earlier passwords      | `SecurePass@123` at signup, then `NewSecurePass@456`, both replaced via the reset flow |
| role                   | buyer                                                                                  |
| `is_email_verified`    | true                                                                                   |
| `referred_by_agent_id` | 1 (auto-assigned, see notes)                                                           |
| verification OTP used  | `344388` (consumed)                                                                    |

### Buyer (spare, unverified)

| Field               | Value                     |
| ------------------- | ------------------------- |
| user id             | 134                       |
| email               | `gofov19331@murkstar.com` |
| password            | `SecurePass@123`          |
| `is_email_verified` | false                     |

Kept unverified on purpose. Use it to re-test the `UNVERIFIED_EMAIL` branch without registering a new account.

### Admin

| Field    | Value                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| user id  | 1                                                                                                                    |
| email    | `admin@debridgers.com`                                                                                               |
| password | `Admin@2026!`                                                                                                        |
| source   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `apps/debridgers-backend/.env`, seeded by `src/infrastructure/seeders/seeder.ts` |

### Throwaway accounts created during negative tests

- `esc-admin-test@murkstar.com` (rejected, never created)
- `weak-pass-test@murkstar.com` (rejected, never created)

## Security layer keys

`keys.guard.ts` gates agent, buyer, admin, and payment routes on header/env pairs. None of these vars existed in `.env`, which made every guarded route unreachable: the guard compares the header to `process.env[...]`, so an unset var rejects both the request that omits the header and the one that sends it. Added to `apps/debridgers-backend/.env` and documented empty in `.env.example`.

| Header            | Env var         | Dev value                            |
| ----------------- | --------------- | ------------------------------------ |
| `X-Request-Key`   | `REQUEST_KEY`   | `request_key_change_in_production`   |
| `X-Admin-Key-1`   | `ADMIN_KEY_1`   | `admin_key_1_change_in_production`   |
| `X-Admin-Key-2`   | `ADMIN_KEY_2`   | `admin_key_2_change_in_production`   |
| `X-Payment-Key`   | `PAYMENT_KEY_1` | `payment_key_1_change_in_production` |
| `X-Payment-Key_2` | `PAYMENT_KEY_2` | `payment_key_2_change_in_production` |

The request, payment1, and payment2 values match what `02-payment.sh` and `04-agent.sh` already send. The two admin values are new, since no admin-key example existed in those scripts.

The frontend sends the request key as `VITE_REQUEST_KEY` (`apiFetch.ts:25`), now set in `apps/debridgers-frontend/.env` and documented in its `.env.example`. It must match `REQUEST_KEY` on the backend.

Verified: `GET /buyer/me` with a valid bearer token returns 403 without the header and 200 with it.

## Results

| #   | Endpoint                     | Case                       | Expected        | Actual                                      | Status |
| --- | ---------------------------- | -------------------------- | --------------- | ------------------------------------------- | ------ |
| 1   | `POST /auth/register`        | new buyer                  | 201             | 201                                         | PASS   |
| 2   | `POST /auth/login`           | before verification        | 401             | 401 "Please verify your email"              | PASS   |
| 3   | `POST /auth/verify-email`    | valid OTP                  | 200 + tokens    | 200 + tokens                                | PASS   |
| 4   | `POST /auth/login`           | after verification         | 200             | 200                                         | PASS   |
| 5   | `POST /auth/refresh`         | valid refresh token        | 200 + new pair  | 200 + new pair                              | PASS   |
| 6   | `POST /auth/refresh`         | rotated-out token          | 401             | 200 + new pair, then 401 after fix          | FIXED  |
| 7   | `POST /auth/logout`          | valid access token         | 200             | 200                                         | PASS   |
| 8   | `POST /auth/refresh`         | after logout               | 401             | 401                                         | PASS   |
| 9   | `POST /auth/admin/login`     | admin credentials          | 200             | 200                                         | PASS   |
| 10  | `POST /auth/admin/login`     | buyer credentials          | 401             | 401 "Admin access only"                     | PASS   |
| 11  | `POST /auth/register`        | `role: "admin"`            | 400             | 400, role rejected                          | PASS   |
| 12  | `POST /auth/register`        | duplicate verified email   | 409             | 409 "Email already registered"              | PASS   |
| 13  | `POST /auth/register`        | duplicate unverified email | 409 + `code`    | 409, `code` missing, then present after fix | FIXED  |
| 14  | `POST /auth/register`        | weak password              | 400             | 400, all 4 rules listed                     | PASS   |
| 15  | `POST /auth/login`           | wrong password             | 401             | 401 "Invalid credentials"                   | PASS   |
| 16  | `POST /auth/resend-otp`      | verified account           | 200 generic     | 200 generic                                 | PASS   |
| 17  | `POST /auth/resend-otp`      | nonexistent account        | 200 generic     | 200 generic, identical                      | PASS   |
| 18  | `POST /auth/forgot-password` | existing account           | 200             | 200                                         | PASS   |
| 19  | `POST /auth/reset-password`  | valid token                | 200             | 200                                         | PASS   |
| 20  | `POST /auth/login`           | new password               | 200             | 200                                         | PASS   |
| 21  | `POST /auth/reset-password`  | replayed token             | 400             | 400 "Invalid or expired"                    | PASS   |
| 22  | `POST /auth/login`           | 8 rapid requests           | 429 after limit | 4x200 then 4x429                            | PASS   |

20 pass on the first run. The 1 failure and 1 partial were both fixed and re-verified, so all 22 cases now pass.

## Open issues found

### 1. Refresh token revocation is broken (high) - FIXED 2026-08-08

`auth.service.ts:600` hashes refresh tokens with bcrypt and line 307 compares them. bcrypt truncates input at 72 bytes. The JWTs are 356 bytes and their first 72 bytes are identical for a given user:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEzNywiaWQiOjEzNywiZW1haWw
```

Everything that distinguishes one token from another (`exp`, `iat`, `device`, `ip_address`, signature) sits past the cut. Verified against the project's own `bcryptjs`:

- `compare(refresh_token, hash(refresh_token))` is true
- `compare(access_token, hash(refresh_token))` is true
- `compare(first_72_chars + arbitrary_tail, hash(refresh_token))` is true

Consequences:

- Rotation does not revoke. A rotated-out refresh token stays valid for its full 7 day life (test 6).
- A 15 minute access token can be redeemed at `/auth/refresh` for a 7 day refresh token.
- Only `logout` truly revokes, because it nulls the column outright.

Not forgeable: `RefreshGuard` still checks signature and expiry first. This is a revocation failure, not an auth bypass.

Fix applied: added `hashRefreshToken()` using SHA-256, used by `saveRefreshToken` and compared in `refreshTokens` with `crypto.timingSafeEqual` behind a length guard. Passwords stay on bcrypt. Stored hashes are now 64 char hex instead of `$2a$`.

Re-verified after the fix:

| Case                               | Before | After              |
| ---------------------------------- | ------ | ------------------ |
| rotate with valid refresh token    | 200    | 200                |
| replay rotated-out refresh token   | 200    | 401                |
| access token used as refresh token | 200    | 401                |
| login, refresh, logout, refresh    | n/a    | 200, 200, 200, 401 |

Migration note: refresh tokens issued before the fix are bcrypt hashes and fail the length guard, so anyone holding one gets 401 on their next refresh and logs in again. That is the desired outcome, since those were exactly the tokens that could not be revoked.

### 2. Exception filter drops custom fields (medium) - FIXED 2026-08-08

`src/filters/http-exception.filter.ts` forwarded only `message` and `errors`. `auth.service.ts:73` throws `code: "UNVERIFIED_EMAIL"` alongside its message, and that field never reached the client (test 13), so the frontend could not branch on it to route users to the OTP screen.

Fix applied: the filter now reads `code` off the exception body and appends it to the payload. Forwarded as an explicit allow-list rather than by spreading the body, so exception internals cannot reach clients by accident.

Verified: re-registering an unverified email now returns

```json
{
  "statusCode": 409,
  "message": "This email is registered but not yet verified.",
  "code": "UNVERIFIED_EMAIL"
}
```

### 3. Password reset does not revoke sessions (medium) - FIXED 2026-08-08

`resetPassword` updated the password and deleted the reset row but never cleared `users.refresh_token`, so anyone holding a refresh token kept access through the exact recovery step meant to lock them out.

Fix applied: `refresh_token: null` is set in the same update as the new password hash.

Verified: login, forgot-password, reset-password, then refresh with the pre-reset token returns 401. Login with the new password returns 200.

### 4. Unreferred signups credited to the admin account (not a bug)

Buyers registered with no `referred_by_agent_code` come back with `referred_by_agent_id: 1`. Investigated: `resolveBuyerReferrerId` at `auth.service.ts:563` deliberately falls back to the user matching `ADMIN_EMAIL` and caches it in `defaultReferrerIdCache`. Admin is user 1, so this reads as "agent 1" but is house attribution by design, not credit landing in a real agent's account.

Left as is. Changing it to null would need a check of whatever commission logic assumes a non-null referrer.

## Environment notes

- Backend runs on port **4001**, not the 4000 in `docker/docker-compose.yml`. Only `postgres` and `redis` are containers; Nest runs on the host.
- `UPSTASH_REDIS_URL` is commented out in `apps/debridgers-backend/.env`. The Upstash host `poetic-sawfish-75729.upstash.io` no longer resolves, and because `RedisService.get/set/del` have no timeout, every login hung indefinitely. The provider now falls back to in-memory cache. Restore the variable only after pointing it at a live instance.
- `redis.provider.ts:16` logs "Redis cache connected (Upstash)" even when nothing connected, because `new KeyvRedis()` connects lazily and never throws. The try/catch fallback is unreachable.
- Rate limits while testing: login 5/min, admin login 3/min, forgot-password 5/min, verify-email 5/min.
- Failed login lockout is separate from the throttler: 6 to 9 failures is a 20 minute lockout, escalating to 24 hours past 20.
