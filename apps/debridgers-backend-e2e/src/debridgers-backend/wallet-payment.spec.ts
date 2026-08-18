import { apiFetch, authHeaders } from "../support/api-client";
import {
  registerBuyer,
  getFirstZoneId,
  getCheapestProductId,
  fundWalletViaWebhook,
} from "../support/buyer-fixture";

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";

interface WalletResponse {
  data?: { wallet?: { available_balance: number } };
}

interface CreateOrderResponse {
  data?: { order_id?: number; total_kobo?: number };
}

interface Notification {
  title: string;
}

interface NotificationsResponse {
  data?: Notification[];
}

async function getAvailableBalance(token: string): Promise<number> {
  const res = await apiFetch<WalletResponse>(`${BASE}/buyer/wallet`, {
    headers: authHeaders(token),
  });
  return res.body.data?.wallet?.available_balance ?? -1;
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
  const orderId = res.body.data?.order_id;
  const totalKobo = res.body.data?.total_kobo;
  expect(orderId).toBeDefined();
  expect(totalKobo).toBeDefined();

  return { orderId: orderId as number, totalKobo: totalKobo as number };
}

describe("Wallet order payment", () => {
  let token: string;
  let email: string;
  let zoneId: number;
  let productId: number;

  beforeAll(async () => {
    const buyer = await registerBuyer(BASE, "wallet-pay-buyer");
    token = buyer.token;
    email = buyer.email;
    zoneId = await getFirstZoneId(BASE);
    productId = await getCheapestProductId(BASE);
  });

  it("debits the wallet by exactly the order total and confirms the order", async () => {
    const { orderId, totalKobo } = await createOrder(token, zoneId, productId);

    // Fund the wallet with exactly the order total, no more.
    await fundWalletViaWebhook(BASE, token, email, totalKobo);
    expect(await getAvailableBalance(token)).toBe(totalKobo);

    const payRes = await apiFetch(`${BASE}/buyer/orders/${orderId}/pay`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        payment_method: "wallet",
        amount_kobo: totalKobo,
      }),
    });
    expect(payRes.status).toBe(200);

    expect(await getAvailableBalance(token)).toBe(0);

    const orderRes = await apiFetch<{
      data?: { status?: string; payment_status?: string };
    }>(`${BASE}/buyer/orders/${orderId}`, { headers: authHeaders(token) });
    expect(orderRes.body.data?.payment_status).toBe("paid");
    expect(orderRes.body.data?.status).toBe("confirmed");

    // A second payment attempt on an already-paid order must be refused, and
    // must not touch the balance (which is already 0 here).
    const secondPayRes = await apiFetch<{ message?: string }>(
      `${BASE}/buyer/orders/${orderId}/pay`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          payment_method: "wallet",
          amount_kobo: totalKobo,
        }),
      },
    );
    expect(secondPayRes.status).toBe(400);
    expect(secondPayRes.body.message).toMatch(/already paid/i);
    expect(await getAvailableBalance(token)).toBe(0);
  });

  it("refuses payment with insufficient balance and leaves the balance untouched", async () => {
    const { orderId, totalKobo } = await createOrder(token, zoneId, productId);

    const balanceBefore = await getAvailableBalance(token);
    expect(balanceBefore).toBeLessThan(totalKobo);

    const payRes = await apiFetch<{ message?: string }>(
      `${BASE}/buyer/orders/${orderId}/pay`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          payment_method: "wallet",
          amount_kobo: totalKobo,
        }),
      },
    );
    expect(payRes.status).toBe(400);
    expect(payRes.body.message).toMatch(/insufficient/i);

    expect(await getAvailableBalance(token)).toBe(balanceBefore);

    const orderRes = await apiFetch<{ data?: { payment_status?: string } }>(
      `${BASE}/buyer/orders/${orderId}`,
      { headers: authHeaders(token) },
    );
    expect(orderRes.body.data?.payment_status).toBe("unpaid");
  });

  it("refuses withdrawal with no payout account set, and leaves the balance untouched", async () => {
    const balanceBefore = await getAvailableBalance(token);

    const res = await apiFetch<{ message?: string }>(
      `${BASE}/buyer/wallet/withdraw`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ amount_kobo: 20000 }),
      },
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/bank account/i);
    expect(await getAvailableBalance(token)).toBe(balanceBefore);
  });

  it("creates buyer notifications for order placement and wallet payment", async () => {
    const { orderId, totalKobo } = await createOrder(token, zoneId, productId);
    await fundWalletViaWebhook(BASE, token, email, totalKobo);

    const payRes = await apiFetch(`${BASE}/buyer/orders/${orderId}/pay`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        payment_method: "wallet",
        amount_kobo: totalKobo,
      }),
    });
    expect(payRes.status).toBe(200);

    const notifRes = await apiFetch<NotificationsResponse>(
      `${BASE}/buyer/notifications?limit=50`,
      { headers: authHeaders(token) },
    );
    expect(notifRes.status).toBe(200);
    const titles = (notifRes.body.data ?? []).map((n) => n.title);

    expect(titles.some((t) => t === `Order #${orderId} received`)).toBe(true);
    expect(titles.some((t) => t === "Payment Confirmed")).toBe(true);
  });
});

export {};
