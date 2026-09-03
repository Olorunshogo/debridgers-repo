import { apiFetch, JSON_HEADERS, authHeaders } from "../support/api-client";
import { loginAdmin, registerBuyer } from "../support/buyer-fixture";
import { TERMS_CONSENT } from "../support/terms-consent";

/*
 * Regression locks for the referral attribution bugs fixed in Phase 0.
 *
 * Two of these guard behaviour that was silently wrong in production rather
 * than merely absent: buyer signup matched the agent recruitment code instead
 * of the buyer code, and an unrecognised code attributed the buyer to the admin
 * account instead of failing.
 */

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2026!";
const AGENT_PASSWORD = "Password@123";

// === Types

interface AgentProfileCodes {
  referral_buyer_code?: string | null;
  referral_agent_code?: string | null;
}

interface AgentListResponse {
  data?: { id: number; email?: string }[];
}

interface ValidateResponse {
  data?: { valid: boolean; referrer_name?: string };
}

interface RegisterErrorResponse {
  message?: string | { message?: string; code?: string; field?: string };
  code?: string;
}

// === Helpers

async function registerAgent(emailPrefix: string): Promise<string> {
  const email = `${emailPrefix}+${Date.now()}+${Math.floor(
    Math.random() * 1e6,
  )}@test.com`;

  const res = await apiFetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      first_name: "E2E",
      last_name: "Agent",
      email,
      password: AGENT_PASSWORD,
      role: "agent",
      ...TERMS_CONSENT,
    }),
  });

  if (res.status !== 201) {
    throw new Error(`registerAgent failed: ${JSON.stringify(res.body)}`);
  }

  return email;
}

async function login(email: string, password: string): Promise<string> {
  const res = await apiFetch<{ data?: { accessToken?: string } }>(
    `${BASE}/auth/login`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    },
  );

  const token = res.body.data?.accessToken;
  if (!token) {
    throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  }

  return token;
}

describe("Referral attribution", () => {
  let adminToken = "";
  let agentEmail = "";
  let agentToken = "";
  let buyerCode = "";
  let agentCode = "";

  beforeAll(async () => {
    adminToken = await loginAdmin(BASE, ADMIN_EMAIL, ADMIN_PASSWORD);

    agentEmail = await registerAgent("e2e-referrer");

    /*
     * Codes are only issued on approval, and a pending agent cannot log in at
     * all, so approval has to happen before the agent gets a token. The admin
     * list filters by status rather than by search term, so the agent is
     * matched on email out of the pending list.
     */
    const pending = await apiFetch<AgentListResponse>(
      `${BASE}/admin/agents?status=pending`,
      { headers: authHeaders(adminToken) },
    );

    const agentId = pending.body.data?.find(
      (a) => a.email?.toLowerCase() === agentEmail.toLowerCase(),
    )?.id;

    if (!agentId) {
      throw new Error(`Could not find ${agentEmail} in the pending agent list`);
    }

    const approval = await apiFetch(`${BASE}/admin/agents/${agentId}/status`, {
      method: "PATCH",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ status: "approved" }),
    });

    if (approval.status !== 200) {
      throw new Error(`Approval failed: ${JSON.stringify(approval.body)}`);
    }

    agentToken = await login(agentEmail, AGENT_PASSWORD);

    const profile = await apiFetch<{ data?: AgentProfileCodes }>(
      `${BASE}/agent/me`,
      { headers: authHeaders(agentToken) },
    );

    if (profile.status !== 200) {
      throw new Error(`GET /agent/me failed: ${JSON.stringify(profile.body)}`);
    }

    buyerCode = profile.body.data?.referral_buyer_code ?? "";
    agentCode = profile.body.data?.referral_agent_code ?? "";
  });

  // === Code issuance

  it("issues both referral codes on approval", () => {
    expect(buyerCode).toMatch(/^BUYER-[0-9A-F]{8}$/);
    expect(agentCode).toMatch(/^AGENT-[0-9A-F]{8}$/);
  });

  /*
   * The two codes used to share one random suffix, so publishing the buyer code
   * handed out the agent recruitment code as well.
   */
  it("gives the two codes independent suffixes", () => {
    expect(buyerCode.replace("BUYER-", "")).not.toBe(
      agentCode.replace("AGENT-", ""),
    );
  });

  // === Validation endpoint

  it("validates a real buyer code and names the referrer", async () => {
    const res = await apiFetch<ValidateResponse>(
      `${BASE}/auth/referral/validate?code=${encodeURIComponent(buyerCode)}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data?.valid).toBe(true);
    expect(res.body.data?.referrer_name).toBeTruthy();
  });

  it("rejects a code that does not exist", async () => {
    const res = await apiFetch<ValidateResponse>(
      `${BASE}/auth/referral/validate?code=BUYER-DEADBEEF`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data?.valid).toBe(false);
  });

  // === Attribution at signup

  /*
   * The bug: registration matched `referral_agent_code`, so the correct
   * buyer-facing code produced no attribution at all.
   */
  it("attributes a buyer who signs up with the agent's BUYER code", async () => {
    const email = `e2e-referred+${Date.now()}@test.com`;

    const res = await apiFetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        first_name: "E2E",
        last_name: "Referred",
        email,
        password: "Password@123",
        role: "buyer",
        referred_by_agent_code: buyerCode,
        ...TERMS_CONSENT,
      }),
    });

    expect(res.status).toBe(201);

    const referred = await apiFetch<{ data?: { id: number }[] }>(
      `${BASE}/admin/buyers?search=${encodeURIComponent(email)}`,
      { headers: authHeaders(adminToken) },
    );

    expect(referred.body.data?.length).toBeGreaterThan(0);
  });

  /*
   * The bug: an unknown code fell through to the admin account, permanently
   * attributing that buyer to admin with no error shown to anyone.
   */
  it("refuses registration when the referral code is unknown", async () => {
    const res = await apiFetch<RegisterErrorResponse>(`${BASE}/auth/register`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        first_name: "E2E",
        last_name: "BadCode",
        email: `e2e-badcode+${Date.now()}@test.com`,
        password: "Password@123",
        role: "buyer",
        referred_by_agent_code: "BUYER-NOTREAL1",
        ...TERMS_CONSENT,
      }),
    });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain("INVALID_REFERRAL_CODE");
  });

  it("still allows registration with no referral code at all", async () => {
    const buyer = await registerBuyer(BASE, "e2e-organic");
    expect(buyer.token).toBeTruthy();
  });
});
