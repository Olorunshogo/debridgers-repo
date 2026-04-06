const BASE = process.env.API_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2026!";

let adminToken: string;

describe("Admin", () => {
  beforeAll(async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    adminToken = data.data?.accessToken;
  });

  it("GET /admin/dashboard should return stats", async () => {
    const res = await fetch(`${BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.total_agents).toBeDefined();
    expect(data.data.total_buyers).toBeDefined();
    expect(data.data.total_orders).toBeDefined();
  });

  it("GET /admin/agents should return agent list", async () => {
    const res = await fetch(`${BASE}/admin/agents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /admin/agents?status=pending should filter by status", async () => {
    const res = await fetch(`${BASE}/admin/agents?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /admin/buyers should return buyer list", async () => {
    const res = await fetch(`${BASE}/admin/buyers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /admin/leads should return leads", async () => {
    const res = await fetch(`${BASE}/admin/leads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });

  it("GET /admin/stock/requests should return stock requests", async () => {
    const res = await fetch(`${BASE}/admin/stock/requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /admin/stock/inventory should return stock stats", async () => {
    const res = await fetch(`${BASE}/admin/stock/inventory`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.current_stock).toBeDefined();
    expect(data.data.total_received).toBeDefined();
  });

  it("Non-admin should get 401 on admin routes", async () => {
    const res = await fetch(`${BASE}/admin/dashboard`);
    expect(res.status).toBe(401);
  });
});

export {};
