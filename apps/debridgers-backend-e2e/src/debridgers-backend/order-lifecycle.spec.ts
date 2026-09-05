import { apiFetch, authHeaders } from "../support/api-client";
import {
  registerBuyer,
  loginAdmin,
  getFirstZoneId,
  getCheapestProductId,
  fundWalletViaWebhook,
} from "../support/buyer-fixture";

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@debridgers.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "WGxMWQP8RfIMjNWVTpJo";

interface CreateOrderResponse {
  data?: { order_id?: number; total_kobo?: number };
}

interface AdminOrderResponse {
  data?: { status?: string; delivered_at?: string | null };
}

async function createOrder(
  token: string,
  zoneId: number,
  productId: number,
): Promise<{ orderId: number; totalKobo: number }> {
  const res = await apiFetch<CreateOrderResponse>(`${BASE}/buyer/orders`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      delivery_address: "12 Test Street, Kaduna",
      zone_id: zoneId,
      delivery_time: "morning",
      cart: [{ product_id: productId, qty: 1 }],
    }),
  });

  expect([200, 201]).toContain(res.status);
  return {
    orderId: res.body.data?.order_id as number,
    totalKobo: res.body.data?.total_kobo as number,
  };
}

async function setStatus(
  adminToken: string,
  orderId: number,
  status: string,
): Promise<{ status: number; message?: string }> {
  const res = await apiFetch<{ message?: string }>(
    `${BASE}/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(adminToken),
      body: JSON.stringify({ status }),
    },
  );
  return { status: res.status, message: res.body.message };
}

describe("Order lifecycle (admin)", () => {
  let buyerToken: string;
  let buyerEmail: string;
  let adminToken: string;
  let zoneId: number;
  let productId: number;

  beforeAll(async () => {
    const buyer = await registerBuyer(BASE, "lifecycle-buyer");
    buyerToken = buyer.token;
    buyerEmail = buyer.email;
    adminToken = await loginAdmin(BASE, ADMIN_EMAIL, ADMIN_PASSWORD);
    zoneId = await getFirstZoneId(BASE);
    productId = await getCheapestProductId(BASE);
  });

  it("refuses a transition that skips the legal path", async () => {
    const { orderId } = await createOrder(buyerToken, zoneId, productId);

    // pending -> out_for_delivery is not a legal move.
    const result = await setStatus(adminToken, orderId, "out_for_delivery");
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/cannot move an order/i);
  });

  it("refuses out_for_delivery while the order is unpaid, then allows it once paid", async () => {
    const { orderId, totalKobo } = await createOrder(
      buyerToken,
      zoneId,
      productId,
    );

    const toConfirmed = await setStatus(adminToken, orderId, "confirmed");
    expect(toConfirmed.status).toBe(200);

    // confirmed but still unpaid: out_for_delivery must be refused.
    const unpaidAttempt = await setStatus(
      adminToken,
      orderId,
      "out_for_delivery",
    );
    expect(unpaidAttempt.status).toBe(400);
    expect(unpaidAttempt.message).toMatch(/must be paid/i);

    await fundWalletViaWebhook(BASE, buyerToken, buyerEmail, totalKobo);
    const payRes = await apiFetch(`${BASE}/buyer/orders/${orderId}/pay`, {
      method: "POST",
      headers: authHeaders(buyerToken),
      body: JSON.stringify({
        payment_method: "wallet",
        amount_kobo: totalKobo,
      }),
    });
    expect(payRes.status).toBe(200);

    const paidAttempt = await setStatus(
      adminToken,
      orderId,
      "out_for_delivery",
    );
    expect(paidAttempt.status).toBe(200);

    const toDelivered = await setStatus(adminToken, orderId, "delivered");
    expect(toDelivered.status).toBe(200);

    const orderRes = await apiFetch<AdminOrderResponse>(
      `${BASE}/admin/orders/${orderId}`,
      { headers: authHeaders(adminToken) },
    );
    expect(orderRes.body.data?.status).toBe("delivered");
    expect(orderRes.body.data?.delivered_at).not.toBeNull();

    // delivered is terminal: no further transition is legal.
    const afterDelivered = await setStatus(adminToken, orderId, "pending");
    expect(afterDelivered.status).toBe(400);
  });

  it("allows cancellation from an open state, then refuses any move out of cancelled", async () => {
    const { orderId } = await createOrder(buyerToken, zoneId, productId);

    const cancelled = await setStatus(adminToken, orderId, "cancelled");
    expect(cancelled.status).toBe(200);

    const afterCancelled = await setStatus(adminToken, orderId, "confirmed");
    expect(afterCancelled.status).toBe(400);
  });
});

export {};
