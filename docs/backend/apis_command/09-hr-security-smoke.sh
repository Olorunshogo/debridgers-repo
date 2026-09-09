#!/usr/bin/env bash
# HR API security + smoke checks against a running backend.
#
# Security model under test
# -------------------------
# 1. AuthGuard — Bearer JWT required; verifies ACCESS_TOKEN_SECRET; sets req.user.role
# 2. RolesGuard — JWT role must be in @Roles(...); else 403
# 3. Service RBAC — some routes allow "employee" at the guard, then restrict further
#    (manager of reports vs HR vs self). This script only hits guard-level checks.
# 4. Public — GET /hr/jobs*, POST apply, POST /hr/webhooks/jotform-sign (no auth)
#
# Known gap: jotform-sign webhook is unauthenticated (track + harden later).
#
# Usage:
#   BASE_URL=http://localhost:4002/api/v1 ./docs/backend/apis_command/09-hr-security-smoke.sh
#
# Credentials default from backend .env / seeder; override with ADMIN_EMAIL / ADMIN_PASSWORD.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_ENV="${ROOT}/apps/debridgers-backend/.env"

if [[ -f "$BACKEND_ENV" ]]; then
  env_val() {
    grep -E "^${1}=" "$BACKEND_ENV" | head -1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
  }
  ADMIN_EMAIL="${ADMIN_EMAIL:-$(env_val ADMIN_EMAIL)}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(env_val ADMIN_PASSWORD)}"
  ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET:-$(env_val ACCESS_TOKEN_SECRET)}"
  PORT_FROM_ENV="$(env_val PORT || true)"
fi

BASE_URL="${BASE_URL:-http://localhost:${PORT_FROM_ENV:-4002}/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@debridgers.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@2026!}"

PASS=0
FAIL=0
SKIP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok() {
  PASS=$((PASS + 1))
  echo -e "${GREEN}PASS${NC} $1"
}

bad() {
  FAIL=$((FAIL + 1))
  echo -e "${RED}FAIL${NC} $1"
}

skip() {
  SKIP=$((SKIP + 1))
  echo -e "${YELLOW}SKIP${NC} $1"
}

# status body via temp files; prints nothing except on jq needs
req() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local data="${4:-}"
  local url="${BASE_URL}${path}"
  local args=(-sS -o /tmp/hr_smoke_body.json -w "%{http_code}" -X "$method" "$url")
  if [[ -n "$token" ]]; then
    args+=(-H "Authorization: Bearer ${token}")
  fi
  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  curl "${args[@]}"
}

expect_status() {
  local label="$1"
  local want="$2"
  local got="$3"
  if [[ "$got" == "$want" ]]; then
    ok "$label (HTTP $got)"
  else
    bad "$label (want $want, got $got) body=$(head -c 200 /tmp/hr_smoke_body.json)"
  fi
}

forge_token() {
  local role="$1"
  if [[ -z "${ACCESS_TOKEN_SECRET:-}" ]]; then
    echo ""
    return
  fi
  ACCESS_TOKEN_SECRET="$ACCESS_TOKEN_SECRET" node -e "
    const crypto = require('crypto');
    const role = process.argv[1];
    const b64url = (value) =>
      Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
        .toString('base64url');
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const payload = b64url({
      sub: 900001,
      id: 900001,
      email: 'smoke-' + role + '@example.com',
      first_name: 'Smoke',
      last_name: 'Test',
      role,
      api_version: 'v1',
      device: 'smoke',
      ip_address: '127.0.0.1',
      iat: now,
      exp: now + 900,
    });
    const data = header + '.' + payload;
    const sig = crypto
      .createHmac('sha256', process.env.ACCESS_TOKEN_SECRET)
      .update(data)
      .digest('base64url');
    process.stdout.write(data + '.' + sig);
  " "$role"
}

echo -e "${BLUE}=== HR security + smoke (${BASE_URL}) ===${NC}\n"

# --- Login as admin (seeded; role admin is allowed on most HR admin routes)
LOGIN_CODE=$(req POST /auth/login "" "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")
if [[ "$LOGIN_CODE" != "200" && "$LOGIN_CODE" != "201" ]]; then
  echo -e "${RED}Cannot login as admin (HTTP ${LOGIN_CODE}). Fix ADMIN_EMAIL/PASSWORD or BASE_URL.${NC}"
  cat /tmp/hr_smoke_body.json
  exit 1
fi
ADMIN_TOKEN=$(jq -r '.data.accessToken // empty' /tmp/hr_smoke_body.json)
if [[ -z "$ADMIN_TOKEN" ]]; then
  echo -e "${RED}Login response missing data.accessToken${NC}"
  cat /tmp/hr_smoke_body.json
  exit 1
fi
ok "admin login"

# === Layer 1: unauthenticated → 401 on protected routes

echo -e "\n${BLUE}--- AuthGuard (no Bearer) ---${NC}"
for path in \
  /hr/admin/jobs \
  /hr/admin/analytics \
  /hr/org-chart \
  /hr/directory \
  /hr/policies \
  /hr/performance/reviews \
  /hr/admin/expenses \
  /hr/sign-requests
do
  code=$(req GET "$path")
  expect_status "GET $path without token → 401" "401" "$code"
done

code=$(req POST /hr/admin/jobs "" '{"title":"x"}')
expect_status "POST /hr/admin/jobs without token → 401" "401" "$code"

code=$(req POST /hr/admin/sign-requests "" '{"kind":"contract","subject_user_id":1,"title":"x"}')
expect_status "POST /hr/admin/sign-requests without token → 401" "401" "$code"

# === Layer 2: wrong role → 403 (forged JWT; AuthGuard does not require DB user)

echo -e "\n${BLUE}--- RolesGuard (wrong role) ---${NC}"
BUYER_TOKEN=$(forge_token buyer || true)
if [[ -z "$BUYER_TOKEN" ]]; then
  skip "wrong-role matrix (ACCESS_TOKEN_SECRET unavailable)"
else
  for path in \
    /hr/admin/jobs \
    /hr/admin/analytics
  do
    code=$(req GET "$path" "$BUYER_TOKEN")
    expect_status "GET $path as buyer → 403" "403" "$code"
  done
  code=$(req POST /hr/admin/sign-requests "$BUYER_TOKEN" '{"kind":"contract","subject_user_id":1,"title":"x"}')
  expect_status "POST /hr/admin/sign-requests as buyer → 403" "403" "$code"
  code=$(req POST /hr/admin/policies "$BUYER_TOKEN" '{"title":"t","slug":"t","body":"long enough body","effective_at":"2026-01-01T00:00:00.000Z"}')
  expect_status "POST /hr/admin/policies as buyer → 403" "403" "$code"

  code=$(req GET /hr/org-chart "$BUYER_TOKEN")
  expect_status "GET /hr/org-chart as buyer → 403" "403" "$code"

  HM_TOKEN=$(forge_token hiring_manager)
  code=$(req POST /hr/admin/jobs "$HM_TOKEN" '{"title":"Blocked","department":"Ops","location":"Kaduna","description":"long enough description","requirements":"long enough requirements"}')
  expect_status "POST /hr/admin/jobs as hiring_manager → 403 (HR-only write)" "403" "$code"

  code=$(req GET /hr/admin/jobs "$HM_TOKEN")
  expect_status "GET /hr/admin/jobs as hiring_manager → 200" "200" "$code"
fi

# === Layer 3: public routes (no auth)

echo -e "\n${BLUE}--- Public careers ---${NC}"
code=$(req GET /hr/jobs)
expect_status "GET /hr/jobs public → 200" "200" "$code"

# === Layer 4: happy path as admin

echo -e "\n${BLUE}--- Admin/HR happy path ---${NC}"
DUE=$(node -e "process.stdout.write(new Date(Date.now()+7*864e5).toISOString())")
EFF=$(node -e "process.stdout.write(new Date().toISOString())")
SLUG="smoke-policy-$(date +%s)"

code=$(req POST /hr/admin/jobs "$ADMIN_TOKEN" "{\"title\":\"Smoke QA\",\"department\":\"Ops\",\"location\":\"Kaduna\",\"description\":\"Quality assurance engineer for smoke tests.\",\"requirements\":\"Attention to detail and API testing.\"}")
if [[ "$code" == "200" || "$code" == "201" ]]; then
  ok "POST /hr/admin/jobs (HTTP $code)"
else
  bad "POST /hr/admin/jobs (got $code) $(head -c 200 /tmp/hr_smoke_body.json)"
fi
JOB_ID=$(jq -r '.data.id // empty' /tmp/hr_smoke_body.json)
if [[ -n "$JOB_ID" && "$JOB_ID" != "null" ]]; then
  ok "job id=$JOB_ID"
else
  bad "create job returned no data.id"
fi

code=$(req GET /hr/admin/jobs "$ADMIN_TOKEN")
expect_status "GET /hr/admin/jobs" "200" "$code"

code=$(req GET /hr/admin/analytics "$ADMIN_TOKEN")
expect_status "GET /hr/admin/analytics" "200" "$code"

code=$(req GET /hr/org-chart "$ADMIN_TOKEN")
expect_status "GET /hr/org-chart" "200" "$code"

code=$(req GET /hr/directory "$ADMIN_TOKEN")
expect_status "GET /hr/directory" "200" "$code"

code=$(req POST /hr/admin/policies "$ADMIN_TOKEN" "{\"title\":\"Smoke Policy\",\"slug\":\"${SLUG}\",\"body\":\"This is a smoke-test policy body with enough length.\",\"version\":\"1.0\",\"effective_at\":\"${EFF}\"}")
if [[ "$code" == "200" || "$code" == "201" ]]; then
  ok "POST /hr/admin/policies (HTTP $code)"
else
  bad "POST /hr/admin/policies (got $code) $(head -c 200 /tmp/hr_smoke_body.json)"
fi
POLICY_ID=$(jq -r '.data.id // empty' /tmp/hr_smoke_body.json)

code=$(req GET /hr/policies "$ADMIN_TOKEN")
expect_status "GET /hr/policies" "200" "$code"

if [[ -n "$POLICY_ID" ]]; then
  code=$(req POST "/hr/policies/${POLICY_ID}/acknowledge" "$ADMIN_TOKEN")
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    ok "POST /hr/policies/:id/acknowledge (HTTP $code)"
  else
    bad "acknowledge policy (got $code) $(head -c 200 /tmp/hr_smoke_body.json)"
  fi
fi

code=$(req GET /hr/performance/reviews "$ADMIN_TOKEN")
expect_status "GET /hr/performance/reviews" "200" "$code"

code=$(req GET /hr/performance/pips "$ADMIN_TOKEN")
expect_status "GET /hr/performance/pips" "200" "$code"

code=$(req GET /hr/incidents "$ADMIN_TOKEN")
expect_status "GET /hr/incidents" "200" "$code"

code=$(req GET /hr/admin/expenses "$ADMIN_TOKEN")
expect_status "GET /hr/admin/expenses" "200" "$code"

code=$(req GET /hr/admin/project-reports "$ADMIN_TOKEN")
expect_status "GET /hr/admin/project-reports" "200" "$code"

code=$(req GET /hr/sign-requests "$ADMIN_TOKEN")
expect_status "GET /hr/sign-requests" "200" "$code"

# Public webhook: must NOT require Bearer (security note: anyone can POST)
echo -e "\n${BLUE}--- Public Jotform webhook (no auth by design) ---${NC}"
code=$(req POST /hr/webhooks/jotform-sign "" '{"status":"signed","sign_request_id":999999}')
# 404 not found for missing request is fine; 401 would mean it was locked down
if [[ "$code" == "401" ]]; then
  bad "jotform webhook unexpectedly requires auth (HTTP 401)"
elif [[ "$code" == "404" || "$code" == "400" || "$code" == "200" ]]; then
  ok "jotform webhook is public (HTTP $code) — harden with shared secret later"
else
  bad "jotform webhook unexpected HTTP $code $(head -c 200 /tmp/hr_smoke_body.json)"
fi

# Invalid token
echo -e "\n${BLUE}--- Invalid Bearer ---${NC}"
code=$(req GET /hr/admin/jobs "not.a.real.jwt")
expect_status "GET /hr/admin/jobs bad JWT → 401" "401" "$code"

echo -e "\n${BLUE}=== Summary: ${PASS} pass, ${FAIL} fail, ${SKIP} skip ===${NC}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
