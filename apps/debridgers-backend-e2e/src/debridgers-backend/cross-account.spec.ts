import { apiFetch, authHeaders } from "../support/api-client";
import {
  registerBuyer,
  getFirstZoneId,
  getCheapestProductId,
} from "../support/buyer-fixture";

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";

interface CreateOrderResponse {
  data?: { order_id?: number; total_kobo?: number };
}

/*
 * Deposit-reference confirmation is not covered here. Its ownership check in
 * WalletController.confirmDeposit runs only after Paystack verifies the
 * reference as paid, and the deposit created in this environment is never
 * actually paid (that needs a live card charge through the checkout page),
 * so `verified.data.status !== "success"` returns 400 before the ownership
 * branch is ever reached. That branch cannot be exercised without a real
 * completed Paystack transaction.
 */

describe("Cross-account order safety", () => {
  it("refuses one buyer reading another buyer's order", async () => {
    const owner = await registerBuyer(BASE, "cross-owner");
    const intruder = await registerBuyer(BASE, "cross-intruder");
    const zoneId = await getFirstZoneId(BASE);
    const productId = await getCheapestProductId(BASE);

    const orderRes = await apiFetch<CreateOrderResponse>(
      `${BASE}/buyer/orders`,
      {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify({
          delivery_address: "12 Test Street, Kaduna",
          zone_id: zoneId,
          delivery_time: "morning",
          cart: [{ product_id: productId, qty: 1 }],
        }),
      },
    );
    const orderId = orderRes.body.data?.order_id as number;
    expect(orderId).toBeDefined();

    const ownerRead = await apiFetch(`${BASE}/buyer/orders/${orderId}`, {
      headers: authHeaders(owner.token),
    });
    expect(ownerRead.status).toBe(200);

    const intruderRead = await apiFetch(`${BASE}/buyer/orders/${orderId}`, {
      headers: authHeaders(intruder.token),
    });
    expect(intruderRead.status).toBe(404);
  });

  it("refuses one buyer paying another buyer's order", async () => {
    const owner = await registerBuyer(BASE, "cross-pay-owner");
    const intruder = await registerBuyer(BASE, "cross-pay-intruder");
    const zoneId = await getFirstZoneId(BASE);
    const productId = await getCheapestProductId(BASE);

    const orderRes = await apiFetch<CreateOrderResponse>(
      `${BASE}/buyer/orders`,
      {
        method: "POST",
        headers: authHeaders(owner.token),
        body: JSON.stringify({
          delivery_address: "12 Test Street, Kaduna",
          zone_id: zoneId,
          delivery_time: "morning",
          cart: [{ product_id: productId, qty: 1 }],
        }),
      },
    );
    const orderId = orderRes.body.data?.order_id as number;
    const totalKobo = orderRes.body.data?.total_kobo as number;
    expect(orderId).toBeDefined();

    const intruderPay = await apiFetch(`${BASE}/buyer/orders/${orderId}/pay`, {
      method: "POST",
      headers: authHeaders(intruder.token),
      body: JSON.stringify({
        payment_method: "wallet",
        amount_kobo: totalKobo,
      }),
    });
    expect(intruderPay.status).toBe(404);

    const ownerOrder = await apiFetch<{ data?: { payment_status?: string } }>(
      `${BASE}/buyer/orders/${orderId}`,
      { headers: authHeaders(owner.token) },
    );
    expect(ownerOrder.body.data?.payment_status).toBe("unpaid");
  });
});

export {};
