## Current System Flow

### Frontend Pages Status

**Phase 5 Frontend Pages - READY** ✓

- `buyer-management.tsx` — List buyers, search, filter, view profiles
- `deliveries.tsx` — List pending deliveries, search
- `deliveries.$orderId.verify.tsx` — Verify delivery with photo upload
- `buyers.$id.tsx` (assumed) — Buyer profile details
- All using `apiFetch()` for API calls

### Authentication Flow (Current)

```
User
  ↓
POST /auth/login
  ↓
Response: { access_token, refresh_token }
  ↓
apiFetch() stores access_token via auth-cookies.ts
  ↓
Every API call includes: Authorization: Bearer <access_token>
  ↓
401 response? → Automatic refresh via refreshTokens()
```

**File:** `packages/api-client/src/apiFetch.ts`

### NEW: Admin Authentication Flow

```
Admin User
  ↓
Step 1: POST /auth/login (or POST /auth/admin/register for new admins)
  ↓
Response: { access_token }
  ↓
apiFetch() stores access_token (same as before)
  ↓
ALSO: Store admin_api_key locally (localStorage or secure cookie)
       - Super admin: Use SUPER_ADMIN_KEY from backend config
       - Sub admin: Receives admin_api_key from /auth/admin/register response
  ↓
Every admin API call now needs TWO headers:
  1. Authorization: Bearer <access_token>
  2. X-Admin-Key: <admin_api_key>
  ↓
Backend validates both via: AuthGuard → AdminKeyGuard → RolesGuard
```

### What Needs Frontend Updates

**Current apiFetch** does NOT include X-Admin-Key header.

**Option 1: Add to apiFetch (recommended)**

```typescript
// packages/api-client/src/apiFetch.ts

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const adminKey = getAdminApiKey(); // NEW

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (adminKey && path.startsWith("/admin/")) {
    // NEW
    headers["X-Admin-Key"] = adminKey;
  }

  // ... rest of function
}
```

**Option 2: Pass header per request (more flexible)**

```typescript
// In buyer-management.tsx
apiFetch("/admin/buyers", {
  headers: {
    "X-Admin-Key": getAdminApiKey(),
  },
});
```

### Frontend Pages - Current Readiness

| Page                           | Endpoint                          | Status | Needs Update?         |
| ------------------------------ | --------------------------------- | ------ | --------------------- |
| buyer-management.tsx           | GET /admin/buyers                 | Ready  | Yes - add X-Admin-Key |
| deliveries.tsx                 | GET /admin/deliveries/pending     | Ready  | Yes - add X-Admin-Key |
| deliveries.$orderId.verify.tsx | POST /admin/deliveries/:id/verify | Ready  | Yes - add X-Admin-Key |
| buyer profile                  | GET /admin/buyers/:id             | Ready  | Yes - add X-Admin-Key |

### Flow Summary

**Super Admin**:

```
1. Login: POST /auth/login
2. Frontend stores access_token (auto via apiFetch)
3. Backend: SUPER_ADMIN_KEY env var (not per-user)
4. Frontend: Hardcode or load from config: X-Admin-Key = SUPER_ADMIN_KEY
5. All admin requests include both headers
```

**Sub Admin (Domain Admin)**:

```
1. Receive email with invite code (from super admin)
2. Register: POST /auth/admin/register
   - Body: email, password, first_name, last_name, invite_code
   - Response: { admin_api_key: "a1b2c3..." }
3. Frontend stores admin_api_key securely (localStorage.encrypted or sessionStorage)
4. Login: POST /auth/login (normal login)
5. All admin requests include both headers
   - Authorization: Bearer <access_token>
   - X-Admin-Key: <admin_api_key>
```

### Integration Checklist

- [ ] Add X-Admin-Key header support to apiFetch (packages/api-client)
- [ ] Add admin_api_key storage/retrieval utility
- [ ] Update buyer-management.tsx to include header
- [ ] Update deliveries.tsx to include header
- [ ] Update deliveries.$orderId.verify.tsx to include header
- [ ] Test with super admin (use SUPER_ADMIN_KEY)
- [ ] Test with sub admin (use returned admin_api_key)
- [ ] Handle 401 "X-Admin-Key invalid" errors gracefully

### Backend Endpoints Ready

All endpoints now protect with: `@UseGuards(AuthGuard, AdminKeyGuard, RolesGuard)`

- ✓ GET /admin/buyers
- ✓ GET /admin/buyers/:id
- ✓ POST /admin/buyers/:id/suspend
- ✓ POST /admin/buyers/:id/unsuspend
- ✓ GET /admin/deliveries/pending
- ✓ GET /admin/deliveries/:id
- ✓ POST /admin/deliveries/:id/verify
- ✓ POST /admin/invites (super admin only)
- ✓ POST /auth/admin/register (new)
