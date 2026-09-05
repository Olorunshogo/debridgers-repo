import { AGENT_TERMS_CONSENT } from "../support/terms-consent";

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "WGxMWQP8RfIMjNWVTpJo";

const testEmail = `agent+${Date.now()}@test.com`;
let agentId: number;
let adminToken: string;
let agentToken: string;
let productId: number;

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
    formData.append("accepted_terms", AGENT_TERMS_CONSENT.accepted_terms);
    formData.append("terms_document", AGENT_TERMS_CONSENT.terms_document);
    formData.append("terms_version", AGENT_TERMS_CONSENT.terms_version);

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
    agentToken = data.data.accessToken;
  });

  it("GET /agent/wallet should return wallet after approval", async () => {
    const res = await fetch(`${BASE}/agent/wallet`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.available_balance).toBeDefined();
    expect(data.data.pending_balance).toBeDefined();
  });

  it("POST /agent/stock/request should deny agent without KYC", async () => {
    // Fetch a product first so Zod validation passes and the KYC check runs
    const productsRes = await fetch(`${BASE}/agent/products`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productsData = (await productsRes.json()) as any;
    const products: { id: number }[] = productsData.data ?? [];
    // Use first product or fallback to 1 (Zod needs a positive int, KYC check fires after)
    productId = products[0]?.id ?? 1;

    const res = await fetch(`${BASE}/agent/stock/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({ product_id: productId, quantity: 5 }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(400);
    expect(data.message).toMatch(/KYC verification required/i);
  });

  it("POST /agent/kyc should submit KYC documents", async () => {
    const formData = new FormData();
    formData.append("id_type", "NIN");
    formData.append("bank_name", "GTBank");
    formData.append("bank_account_number", "0123456789");
    formData.append("bank_account_name", "Amina Yusuf");
    // Attach minimal fake file blobs
    formData.append(
      "id_front",
      new Blob(["id_front"], { type: "image/jpeg" }),
      "id_front.jpg",
    );
    formData.append(
      "id_selfie",
      new Blob(["id_selfie"], { type: "image/jpeg" }),
      "id_selfie.jpg",
    );

    const res = await fetch(`${BASE}/agent/kyc`, {
      method: "POST",
      headers: { Authorization: `Bearer ${agentToken}` },
      body: formData,
    });
    expect(res.status).toBe(200);
  });

  it("GET /agent/kyc should show kyc_status as submitted", async () => {
    const res = await fetch(`${BASE}/agent/kyc`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.kyc_status).toBe("submitted");
  });

  it("GET /admin/kyc should list pending KYC submissions", async () => {
    const res = await fetch(`${BASE}/admin/kyc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.some((a: { id: number }) => a.id === agentId)).toBe(true);
  });

  it("PATCH /admin/agents/:id/kyc should approve KYC", async () => {
    const res = await fetch(`${BASE}/admin/agents/${agentId}/kyc`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: "approved" }),
    });
    expect(res.status).toBe(200);
  });

  it("GET /agent/kyc should show kyc_status as approved after admin review", async () => {
    const res = await fetch(`${BASE}/agent/kyc`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(data.data.kyc_status).toBe("approved");
  });

  it("POST /agent/stock/request should succeed after KYC approval", async () => {
    /*
     * Seeded products carry no warehouse stock (stock_quantity defaults to 0
     * until an admin stocks the warehouse), so the happy path has to put some
     * there first, the same way a real admin would before an agent can be
     * fulfilled.
     */
    await fetch(`${BASE}/admin/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ stock_quantity: 100 }),
    });

    const res = await fetch(`${BASE}/agent/stock/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({ product_id: productId, quantity: 2 }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.data.quantity).toBe(2);
    expect(data.data.status).toBe("pending");
  });
});

export {};
