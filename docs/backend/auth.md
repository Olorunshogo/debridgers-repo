# Auth audit - access and refresh tokens

Written 2026-07-25. Auth currently works end to end, so everything here is a
refactor or hardening item, not a break-fix. Nothing in this document requires
changing the token contract between frontend and backend.

Scope note: this documents the **debridgers** implementation. The side-by-side
comparison against Stayar's backend auth is **not done yet** - the background
agent assigned to it was killed by a session limit before reporting.

## The backend is in good shape

`apps/debridgers-backend/src/app/auth/`

| Mechanism            | Implementation                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Access token         | JWT, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY` default `15m` (`config/access-jwt.ts`)                                             |
| Refresh token        | JWT, separate secret `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY` default `7d` (`config/refresh-jwt.ts`)                           |
| Refresh storage      | Persisted per user as a **bcrypt hash**, never in plaintext (`auth.service.ts:158, 192, 216, 307`)                                   |
| Refresh rotation     | Yes. Every successful refresh issues a new pair and overwrites the stored hash (`auth.service.ts:200-216`)                           |
| Refresh verification | `bcrypt.compare(refreshToken, tokenHash)` against the stored hash (`auth.service.ts:212`), so a valid-but-superseded JWT is rejected |
| Transport scheme     | `Authorization: Refresh <token>` for refresh, `Bearer` for everything else (`guards/refresh.guard.ts`)                               |
| Logout               | Server-side, clears the stored refresh hash (`auth.controller.ts:237`)                                                               |
| Password hashing     | bcrypt, cost 12 (`auth.service.ts:45, 368`)                                                                                          |
| Role model           | `UserRole = "admin" \| "agent" \| "buyer" \| "company"` (`interfaces/users/roles.type.ts`)                                           |
| Role enforcement     | `@Roles(...)` decorator + `RolesGuard` reading JWT `payload.role`                                                                    |

Two secrets, two expiries, hashed-and-rotated refresh, server-side logout.
That is the correct shape. The defects below are all on the client side or in
the interaction between the two.

## Findings, ranked

### 1. No single-flight refresh dedup, and the backend rotates. High.

`packages/api-client/src/apiFetch.ts` calls `refreshTokens()` inline on any
401, with no shared in-flight promise:

```ts
if (res.status === 401) {
  try {
    const { accessToken } = await refreshTokens();
    // ...
```

A dashboard page that fires several requests in parallel after the access
token expires produces several concurrent `POST /auth/refresh` calls. The
backend rotates and stores exactly one hash per user, so the first call wins
and overwrites the hash. Every other in-flight call then fails
`bcrypt.compare` at `auth.service.ts:212`, returns 401, and
`refreshTokens()` calls `clearTokens()` and throws.

Net effect: the user is silently logged out whenever two requests happen to
401 at the same time. This gets more likely as dashboards get denser, and the
farmer role will add more parallel-fetch pages.

Fix: hold a module-level `let refreshPromise: Promise<AuthTokens> | null`.
First caller starts the refresh, everyone else awaits the same promise, clear
it in a `finally`. This is a contained change inside `api-client` and does not
touch the backend contract.

### 2. Tokens are in JS-readable cookies, and the secure path is dead code. High.

`packages/api-client/src/auth.ts` `storeTokens()` writes both tokens with
`document.cookie`, so neither is `HttpOnly` and neither is `Secure`:

```ts
document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; Path=/; Max-Age=900; SameSite=Strict`;
document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; Path=/; Max-Age=604800; SameSite=Strict`;
```

Any XSS on any page can read both tokens, including the 7-day refresh token.

The correct path already exists. `auth-cookies.ts` exports
`buildAuthCookieHeaders()`, which produces proper `HttpOnly; SameSite=Strict;
Secure` Set-Cookie headers for SSR responses. It has **zero consumers**.

The reason it is dead: `apps/debridgers-frontend` is React Router v7 framework
mode with a server build, but there are **zero `loader` or `action` exports in
the entire `app/` directory**. Every auth call is client-side
(`contexts/AuthContext.tsx:100`, `hooks/useAuthActions.ts:112`,
`routes/auth/verify-email.tsx:85`). The app has a server and does not use it.

Fix, and this is the highest-value structural change in the repo: move login,
signup, verify-email, and refresh into React Router `action`s, return
`buildAuthCookieHeaders()` in the response headers, and read tokens from the
request cookie header in `loader`s. That makes the refresh token
unreachable from JS entirely. It is a real piece of work, not a one-liner, and
it should be scoped on its own rather than folded into a styling sweep.

### 3. `clearTokens()` probably does not clear anything. Medium.

`auth.ts` `clearTokens()` feeds `buildClearCookieHeaders()` output into
`document.cookie`:

```ts
const headers = buildClearCookieHeaders();
for (const header of headers) {
  document.cookie = header;
}
```

Those strings contain `HttpOnly`. The `document.cookie` setter is specified to
ignore the `HttpOnly` attribute, and browsers may reject the whole
assignment. So logout may leave both cookies in place until they expire on
their own.

This is marked medium rather than high because the backend logout endpoint
does invalidate the stored refresh hash server-side, so the stale cookies are
not usable for a refresh. But the access token stays valid client-side for up
to its remaining 15 minutes.

Verify in a browser before fixing. If confirmed, the fix is a separate
JS-safe clear path that omits `HttpOnly`, keeping `buildClearCookieHeaders()`
strictly for server responses.

### 4. `SameSite=Strict` on the access token will break redirect returns. Medium.

Strict means the cookie is not sent when the browser arrives from another
site. Any flow that leaves the app and comes back - payment callback, OAuth
redirect, an email link that lands on an authed page - will present as logged
out on the first request after the return.

`SameSite=Lax` is the normal choice for a session cookie and still blocks the
CSRF cases that matter for a token sent as an `Authorization` header. Decide
deliberately rather than by default.

### 5. API responses are cast, never validated. Medium.

`auth.ts` does `json.data as AuthTokens` and `apiFetch` does
`(json as { data: T }).data`. Zod is already used for form input on the
frontend but never on the response boundary. A malformed or changed response
surfaces as an undefined-property crash somewhere downstream instead of a
clear error at the boundary. Parse the envelope with a schema in
`api-client`.

### 5b. Frontend and backend password rules disagree. Medium.

Signup validates `min(8)` only. The backend `passwordRule`
(`dto/register.dto.ts`) additionally requires an uppercase letter, a number,
and a special character. A user can pass client validation and be rejected by
the server. One shared schema fixes this class of bug permanently. Tracked in
`docs/frontend/AuthPLAN.md` Phase 2.

### 6. One refresh hash per user means one session per user. Low, but decide it.

The stored hash is overwritten on every login and every refresh, so logging in
on a phone silently kills the desktop session. That may be intentional. If it
is not, the refresh token needs a per-device family rather than a single
column. Worth deciding before the farmer role ships, since field users are
likely to be on more than one device.

### 7. No reuse detection. Low.

A stolen refresh token used after the legitimate client has already rotated
simply fails, which is correct. But there is no detection of the reuse event
and therefore no family invalidation. Standard hardening, only worth doing
after item 2 lands, since item 2 removes most of the ways a refresh token gets
stolen in the first place.

## Adding the farmer role

The auth layer is genuinely role-extensible. The current union is
`"admin" | "agent" | "buyer" | "company"`, and note that it is already a
four-role system, so farmer is a fifth, not a fourth.

End to end, adding a role touches:

1. `interfaces/users/roles.type.ts` - extend the `UserRole` union and the
   `USER_ROLES` const.
2. The user entity and a migration, if the role is stored as a DB enum rather
   than a plain string column. Confirm which before writing the migration.
3. Any registration path that decides which roles may self-register.
4. `@Roles(...)` annotations on the endpoints the new role may call.
5. Frontend route group, layout, and nav config.
6. Whatever role-to-landing-route map the frontend uses after login.

Nothing in the guard, token, or refresh machinery needs to change. `RolesGuard`
reads `payload.role` generically and `generateTokens` puts the role in the
payload without knowing the set.

The open question is not mechanical. It is whether farmer is close enough to
an existing role to share its pages, which is the analysis in
`docs/frontend/Context.md` "Open decisions" that is still outstanding.

## Suggested order

1. Single-flight refresh (item 1). Small, contained, fixes a live bug.
2. Verify and fix `clearTokens()` (item 3). Small.
3. Decide `SameSite` (item 4). A one-line decision.
4. Response validation at the boundary (item 5). Contained in `api-client`.
5. Move auth to loaders/actions with HttpOnly cookies (item 2). Its own
   scoped piece of work.
6. Session model and reuse detection (items 6, 7). After item 2.

## Resolved

Landed since the findings above were written. Verified against the code, not
against `docs/frontend/AuthPLAN.md`, whose status table still lists these
phases as not started.

- **The register DTO takes a role from an explicit allow-list.**
  `app/auth/dto/register.dto.ts` exports `SELF_REGISTERABLE_ROLES`, currently
  `[USER_ROLES.BUYER, USER_ROLES.AGENT]`, and `registerSchema.role` is a
  `z.enum` over it defaulting to buyer. It is an allow-list rather than the
  full `user_role` enum on purpose, so adding a database role never silently
  makes it self-registerable. Admin and company are excluded.
- **`users.role` now defaults to buyer.**
  `infrastructure/persistence/schemas/users.schema.ts` has
  `role: userRoleEnum().notNull().default("buyer")`, applied by migration
  `0008_fair_eternity.sql` (`ALTER TABLE "users" ALTER COLUMN "role" SET
DEFAULT 'buyer'`). It previously defaulted to agent, which meant any write
  that omitted the role created an agent. Buyer is the least-privileged
  self-registerable role, so the same omission is now harmless.
- **Agent profile rows are created at registration with location fields null.**
  `auth.service.ts:115-119` inserts the `agent_profiles` row with only
  `user_id`, `status: "pending"`, and `referred_by_agent_id`. `address`,
  `state`, and `lga` are left null and `kyc_status` takes its `not_submitted`
  default. Agents supply those later through `PATCH /agent/profile`
  (`app/agent/dto/update-agent-profile.dto.ts`), which is also where setting
  `lga` re-resolves the zone.

Left open by these changes: `POST /agent/apply`
(`app/agent/dto/apply-agent.dto.ts`, wired at `agent.controller.ts:60`) is the
pre-unification registration path and is still live. It requires `lga` and
`address`, takes `confirm_password`, and validates the password as a bare
`min(8)` instead of through `passwordRule`, so the weaker rule is still
reachable. Tracked in `docs/backend/Context.md`.
