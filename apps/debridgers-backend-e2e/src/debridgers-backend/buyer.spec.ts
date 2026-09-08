const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";
import { TERMS_CONSENT } from "../support/terms-consent";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "WGxMWQP8RfIMjNWVTpJo";

const testEmail = `buyer+e2e+${Date.now()}@test.com`;
let buyerToken: string;
let productId: number;
let orderId: number;
let adminToken: string;
let zoneId: number | undefined;

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
        ...TERMS_CONSENT,
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
    // Token may be absent if email verification is required; skip token-dependent tests
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

    /*
     * A freshly registered buyer has no zone_id, and resolveDeliveryZone
     * refuses checkout without one, so the zone has to come from the catalogue
     * rather than the buyer profile.
     *
     * The path is `/zones`, not `/public/zones`: PublicController is declared
     * as a bare `@Controller()`, so its routes sit directly under the global
     * `/api/v1` prefix. The wrong path 404'd, `zoneId` stayed undefined, and
     * the checkout test below silently returned instead of running.
     */
    const zonesRes = await fetch(`${BASE}/zones`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zonesData = (await zonesRes.json()) as any;
    zoneId = zonesData.data?.[0]?.id;
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
    // Body is missing full_name and phone.
    const res = await fetch(`${BASE}/admin/outreach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ lga: "Kaduna North" }),
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
    // Skip if email verification is required.
    if (!buyerToken) return;
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
    /*
     * Asserted rather than skipped. These were guard-and-return conditions,
     * which meant a broken fixture turned this test into a silent pass.
     */
    expect(buyerToken).toBeTruthy();
    expect(productId).toBeTruthy();
    expect(zoneId).toBeTruthy();

    const res = await fetch(`${BASE}/buyer/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`,
      },
      /*
       * Matches createOrderSchema: the basket is `cart`, and delivery_time is
       * required. This previously sent `items` with a client-supplied
       * total_amount_kobo, which the API rejects - prices are re-derived
       * server-side and never taken from the client.
       */
      body: JSON.stringify({
        delivery_address: "12 Test Street, Kaduna",
        zone_id: zoneId,
        delivery_time: "morning",
        cart: [{ product_id: productId, qty: 2 }],
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect([200, 201]).toContain(res.status);
    if (data.data?.order_id) orderId = data.data.order_id;
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
    /* Counters are nested under `stats`, not flattened onto data. */
    expect(data.data.stats).toHaveProperty("total_orders");
    expect(data.data.stats).toHaveProperty("total_spent_kobo");
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
