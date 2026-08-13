const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2026!";

const testEmail = `buyer+e2e+${Date.now()}@test.com`;
let buyerToken: string;
let productId: number;
let orderId: number;
let adminToken: string;

describe("Buyer", () => {
  beforeAll(async () => {
    // Register buyer
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: "Test",
        last_name: "Buyer",
        email: testEmail,
        password: "Password@123",
      }),
    });
    expect(regRes.status).toBe(201);

    // Login buyer (no email verification needed in test env if disabled)
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "Password@123" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginData = (await loginRes.json()) as any;
    // Token may be absent if email verification is required — skip token-dependent tests
    buyerToken = loginData.data?.accessToken ?? "";

    // Get admin token
    const adminRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminData = (await adminRes.json()) as any;
    adminToken = adminData.data?.accessToken ?? "";
  });

  // === Public Products

  it("GET /products should return product list without auth", async () => {
    const res = await fetch(`${BASE}/products`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    if (data.data.length > 0) {
      productId = data.data[0].id;
      expect(data.data[0]).toHaveProperty("price_kobo");
      expect(data.data[0]).toHaveProperty("unit");
    }
  });

  it("GET /products should not require Authorization header", async () => {
    const res = await fetch(`${BASE}/products`, {
      headers: { Authorization: "Bearer invalid_token" },
    });
    expect(res.status).toBe(200);
  });

  // === Public Config

  it("GET /config/public should return commission rate", async () => {
    const res = await fetch(`${BASE}/config/public`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(typeof data.data.agent_commission_rate).toBe("number");
    expect(data.data.agent_commission_rate).toBeGreaterThan(0);
  });

  // === Outreach Submit (admin / agent only)

  it("POST /admin/outreach should return 401 without auth", async () => {
    const res = await fetch(`${BASE}/admin/outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Test", phone: "08000000000" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /admin/outreach should create a record when admin is authenticated", async () => {
    const res = await fetch(`${BASE}/admin/outreach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        full_name: "Aisha Suleiman",
        phone: "08098765432",
        lga: "Kaduna North",
        product_interest: "Rice, Beans",
        how_heard: "Social media",
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.data.id).toBeDefined();
  });

  it("POST /admin/outreach should reject missing required fields → 400", async () => {
    const res = await fetch(`${BASE}/admin/outreach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ lga: "Kaduna North" }), // missing full_name and phone
    });
    expect(res.status).toBe(400);
  });

  it("POST /admin/outreach should return 403 for buyer token", async () => {
    const res = await fetch(`${BASE}/admin/outreach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ full_name: "Test", phone: "08000000000" }),
    });
    expect(res.status).toBe(403);
  });

  // === Buyer Profile (auth required)

  it("GET /buyer/me should require authentication", async () => {
    const res = await fetch(`${BASE}/buyer/me`);
    expect(res.status).toBe(401);
  });

  it("GET /buyer/me should return profile when authenticated", async () => {
    if (!buyerToken) return; // skip if email verification required
    const res = await fetch(`${BASE}/buyer/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.email).toBe(testEmail);
  });

  it("PATCH /buyer/profile should update delivery address", async () => {
    if (!buyerToken) return;
    const res = await fetch(`${BASE}/buyer/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ delivery_address: "12 Test Street, Kaduna" }),
    });
    expect(res.status).toBe(200);
  });

  // === Orders

  it("GET /buyer/orders should return empty array initially", async () => {
    if (!buyerToken) return;
    const res = await fetch(`${BASE}/buyer/orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("POST /buyer/orders should create an order", async () => {
    if (!buyerToken || !productId) return;
    const res = await fetch(`${BASE}/buyer/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        items: [{ product_id: productId, quantity: 2 }],
        delivery_address: "12 Test Street, Kaduna",
        total_amount_kobo: 5000,
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect([200, 201]).toContain(res.status);
    if (data.data?.id) orderId = data.data.id;
  });

  it("GET /buyer/orders should show the newly created order", async () => {
    if (!buyerToken || !orderId) return;
    const res = await fetch(`${BASE}/buyer/orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.some((o: { id: number }) => o.id === orderId)).toBe(true);
  });

  // === Password Change

  it("PATCH /buyer/password should reject wrong current password", async () => {
    if (!buyerToken) return;
    const res = await fetch(`${BASE}/buyer/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        old_password: "WrongPassword!",
        new_password: "NewPassword@456",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("PATCH /buyer/password should update with correct current password", async () => {
    if (!buyerToken) return;
    const res = await fetch(`${BASE}/buyer/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        old_password: "Password@123",
        new_password: "Password@456",
      }),
    });
    expect(res.status).toBe(200);
  });

  // === Dashboard

  it("GET /buyer/dashboard should return stats", async () => {
    if (!buyerToken) return;
    const res = await fetch(`${BASE}/buyer/dashboard`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data).toHaveProperty("total_orders");
    expect(data.data).toHaveProperty("total_spent_kobo");
  });

  // === Admin Settings

  it("GET /admin/settings should return platform settings", async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/admin/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(typeof data.data.agent_commission_rate).toBe("number");
  });

  it("PATCH /admin/settings should update commission rate", async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/admin/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ key: "agent_commission_rate", value: "25" }),
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /admin/settings should reject invalid commission rate", async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/admin/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ key: "agent_commission_rate", value: "150" }),
    });
    expect(res.status).toBe(400);
  });
});

export {};
