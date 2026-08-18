import { apiFetch, authHeaders } from "../support/api-client";
import { postWebhook, readPaystackSecret } from "../support/paystack-webhook";
import { registerBuyer } from "../support/buyer-fixture";
import { seedPendingDeposit } from "../support/wallet-seed";

const BASE = process.env.VITE_API_URL || "http://localhost:4000/api/v1";

interface WalletResponse {
  data?: { wallet?: { available_balance: number } };
}

let secret: string;

describe("Paystack webhook", () => {
  beforeAll(() => {
    secret = readPaystackSecret();
  });

  // === Signature verification

  it("rejects a request with no signature header", async () => {
    const res = await postWebhook(
      BASE,
      secret,
      {
        event: "charge.success",
        data: { reference: "no_sig_ref", amount: 100 },
      },
      null,
    );

    expect(res.status).toBe(400);
  });

  it("rejects a request with a wrong signature", async () => {
    const res = await postWebhook(
      BASE,
      secret,
      {
        event: "charge.success",
        data: { reference: "wrong_sig_ref", amount: 100 },
      },
      "0".repeat(128),
    );

    expect(res.status).toBe(401);
  });

  it("accepts a request with a correctly computed signature", async () => {
    const res = await postWebhook(BASE, secret, {
      event: "charge.success",
      data: { reference: "no_matching_order_or_deposit", amount: 100 },
    });

    // No order or pending deposit matches this reference, so the handler
    // falls through to its no-op branch, but the signature itself is valid.
    expect(res.status).toBe(200);
  });

  // === Deposit idempotency (webhook replay)

  it("credits a deposit exactly once even when the webhook fires twice", async () => {
    const buyer = await registerBuyer(BASE, "webhook-buyer");
    const amountKobo = 250000; // ₦2,500, above the ₦200 deposit minimum

    /*
     * Reading the wallet both creates it and pins the starting balance. The
     * pending deposit is seeded rather than initiated through
     * POST /buyer/wallet/deposit, which would need a live Paystack call.
     */
    const walletBefore = await apiFetch<WalletResponse>(
      `${BASE}/buyer/wallet`,
      {
        headers: authHeaders(buyer.token),
      },
    );
    expect(walletBefore.body.data?.wallet?.available_balance).toBe(0);

    const reference = await seedPendingDeposit(buyer.email, amountKobo);

    const event = {
      event: "charge.success",
      data: {
        reference,
        amount: amountKobo,
        customer: { email: buyer.email, first_name: "E2E" },
      },
    };

    const first = await postWebhook(BASE, secret, event);
    expect(first.status).toBe(200);

    const walletAfterFirst = await apiFetch<WalletResponse>(
      `${BASE}/buyer/wallet`,
      { headers: authHeaders(buyer.token) },
    );
    expect(walletAfterFirst.body.data?.wallet?.available_balance).toBe(
      amountKobo,
    );

    // Paystack retries webhooks; replaying the identical event must not
    // credit the wallet a second time.
    const second = await postWebhook(BASE, secret, event);
    expect(second.status).toBe(200);

    const walletAfterSecond = await apiFetch<WalletResponse>(
      `${BASE}/buyer/wallet`,
      { headers: authHeaders(buyer.token) },
    );
    expect(walletAfterSecond.body.data?.wallet?.available_balance).toBe(
      amountKobo,
    );
  });
});

export {};
