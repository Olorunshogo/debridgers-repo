const BASE = process.env.API_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2026!";

const testEmail = `agent+${Date.now()}@test.com`;
let agentId: number;
let adminToken: string;

describe("Agent", () => {
  beforeAll(async () => {
    // Get admin token to approve agent in later tests
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    adminToken = data.data?.accessToken;
  });

  it("POST /agent/apply should submit application", async () => {
    const formData = new FormData();
    formData.append("first_name", "Amina");
    formData.append("last_name", "Yusuf");
    formData.append("email", testEmail);
    formData.append("phone", "08012345678");
    formData.append("lga", "Kaduna North");
    formData.append("address", "12 Barnawa Market Road, Kaduna");
    formData.append("password", "Password@123");
    formData.append("confirm_password", "Password@123");

    const res = await fetch(`${BASE}/agent/apply`, {
      method: "POST",
      body: formData,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.data.id).toBeDefined();
    agentId = data.data.id;
  });

  it("POST /auth/login should deny unapproved agent", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "Password@123" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(401);
    expect(data.message).toMatch(/not yet approved/i);
  });

  it("PATCH /admin/agents/:id/status should approve agent and generate referral codes", async () => {
    const res = await fetch(`${BASE}/admin/agents/${agentId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "approved" }),
    });
    expect(res.status).toBe(200);
  });

  it("GET /admin/agents/:id should show referral codes after approval", async () => {
    const res = await fetch(`${BASE}/admin/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.referral_buyer_code).toMatch(/^BUYER-/);
    expect(data.data.referral_agent_code).toMatch(/^AGENT-/);
  });

  it("POST /auth/login should allow approved agent", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "Password@123" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.accessToken).toBeDefined();
  });

  it("GET /agent/wallet should return wallet after approval", async () => {
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "Password@123" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginData = (await loginRes.json()) as any;
    const agentToken = loginData.data?.accessToken;

    const res = await fetch(`${BASE}/agent/wallet`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.available_balance).toBeDefined();
    expect(data.data.pending_balance).toBeDefined();
  });
});

export {};
