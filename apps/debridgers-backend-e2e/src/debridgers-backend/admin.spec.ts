const BASE = process.env.API_URL || "http://localhost:4000/api/v1";

let adminToken: string;

describe("Admin", () => {
  beforeAll(async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || "admin@debridger.com",
        password: process.env.ADMIN_PASSWORD || "Admin@2026!",
      }),
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

  it("GET /admin/leads should return leads", async () => {
    const res = await fetch(`${BASE}/admin/leads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });

  it("Non-admin should get 401 on admin routes", async () => {
    const res = await fetch(`${BASE}/admin/dashboard`);
    expect(res.status).toBe(401);
  });
});

export {};
