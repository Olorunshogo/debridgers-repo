import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import { PaymentService } from "./payment.service";
import { LedgerService } from "./ledger.service";
import { AgentWalletService } from "../wallet/agent-wallet.service";
import * as schema from "../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../test/db";

/*
 * The webhook is the only way money enters a buyer's wallet without the buyer
 * asking for it, so these run against a real Postgres: the guarantee under
 * test is a unique index doing its job, and a mocked query builder cannot tell
 * a second credit from the first.
 *
 * Paystack is not called - the payloads are the ones it documents for a
 * dedicated account transfer, signed with the same HMAC the handler verifies.
 */

const hasDb = await databaseAvailable();
const SECRET = "sk_test_stub";

describe.skipIf(!hasDb)("PaymentService webhooks", () => {
  let t: TestDb;
  let payments: PaymentService;
  let ledger: LedgerService;
  let wallet: AgentWalletService;
  let seenWebhookIds: Set<string>;
  let userId: number;

  beforeAll(async () => {
    t = await createTestDatabase("payment_webhook");
    ledger = new LedgerService(t.db);
    wallet = new AgentWalletService(t.db);

    const config = {
      get: (key: string) =>
        key === "PaystackConfig.secretKey" ? SECRET : undefined,
    } as unknown as ConfigService;

    /*
     * Deduplication is stubbed over a real Set rather than mocked away, so a
     * replayed delivery is rejected here exactly as it would be in production
     * and the reference-level guard below is tested behind it, not instead of
     * it.
     */
    const webhookDedup = {
      extractWebhookId: (payload: Record<string, unknown>) =>
        ((payload.data as Record<string, unknown>)?.id as string) ?? null,
      isNewWebhook: async (_provider: string, id: string) => {
        if (!id) return true;
        if (seenWebhookIds.has(id)) return false;
        seenWebhookIds.add(id);
        return true;
      },
    } as unknown as ConstructorParameters<typeof PaymentService>[3];

    const settings = {
      getAgentCommissionRate: async () => 5,
    } as unknown as ConstructorParameters<typeof PaymentService>[2];

    const refundService = {
      handleRefundWebhook: async () => undefined,
    } as unknown as ConstructorParameters<typeof PaymentService>[4];

    const payoutTargets = {} as ConstructorParameters<typeof PaymentService>[5];

    payments = new PaymentService(
      t.db,
      config,
      settings,
      webhookDedup,
      refundService,
      payoutTargets,
      ledger,
      wallet,
    );
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();
    seenWebhookIds = new Set<string>();

    const [user] = await t.db
      .insert(schema.users)
      .values({
        first_name: "Test",
        last_name: "Buyer",
        email: `buyer-${Date.now()}-${Math.random()}@example.com`,
        role: "buyer",
      })
      .returning();
    userId = user.id;
  });

  // === Helpers

  async function walletWithCustomerCode(code: string) {
    const wallet = await ledger.getOrCreateWallet(userId);
    await t.db
      .update(schema.buyerWallets)
      .set({ paystack_customer_code: code })
      .where(eq(schema.buyerWallets.id, wallet.id));
    return wallet;
  }

  function dvaTransfer(params: {
    id: string;
    reference: string;
    amountKobo: number;
    customerCode?: string;
  }): Record<string, unknown> {
    return {
      event: "charge.success",
      data: {
        id: params.id,
        reference: params.reference,
        amount: params.amountKobo,
        channel: "dedicated_nuban",
        customer: params.customerCode
          ? { customer_code: params.customerCode }
          : {},
      },
    };
  }

  function sign(payload: Record<string, unknown>): string {
    return createHmac("sha512", SECRET)
      .update(JSON.stringify(payload))
      .digest("hex");
  }

  async function balanceOf(walletId: number): Promise<number> {
    const wallet = await ledger.getWalletById(walletId);
    return wallet?.available_balance ?? 0;
  }

  // === Dedicated account transfers

  it("credits a transfer into a buyer's dedicated account", async () => {
    const wallet = await walletWithCustomerCode("CUS_alpha");
    const payload = dvaTransfer({
      id: "evt_1",
      reference: "dva_txn_1",
      amountKobo: 4_500_000,
      customerCode: "CUS_alpha",
    });

    await payments.handleWebhook(payload, sign(payload));

    expect(await balanceOf(wallet.id)).toBe(4_500_000);

    const [row] = await t.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.reference, "dva_txn_1"));

    expect(row.type).toBe("deposit");
    expect(row.status).toBe("completed");
    expect(row.amount).toBe(4_500_000);
  });

  it("counts the transfer towards lifetime deposits", async () => {
    const wallet = await walletWithCustomerCode("CUS_beta");
    const payload = dvaTransfer({
      id: "evt_2",
      reference: "dva_txn_2",
      amountKobo: 1_000_000,
      customerCode: "CUS_beta",
    });

    await payments.handleWebhook(payload, sign(payload));

    const updated = await ledger.getWalletById(wallet.id);
    expect(updated?.total_deposited).toBe(1_000_000);
  });

  /*
   * The reference guard, not the delivery-id guard. Paystack re-sending the
   * same transfer under a fresh event id must still not credit twice.
   */
  it("does not credit twice when the same transfer arrives as a new event", async () => {
    const wallet = await walletWithCustomerCode("CUS_gamma");
    const first = dvaTransfer({
      id: "evt_3a",
      reference: "dva_txn_3",
      amountKobo: 2_000_000,
      customerCode: "CUS_gamma",
    });
    const second = dvaTransfer({
      id: "evt_3b",
      reference: "dva_txn_3",
      amountKobo: 2_000_000,
      customerCode: "CUS_gamma",
    });

    await payments.handleWebhook(first, sign(first));
    await payments.handleWebhook(second, sign(second));

    expect(await balanceOf(wallet.id)).toBe(2_000_000);
  });

  it("credits nothing when the customer code matches no wallet", async () => {
    const wallet = await walletWithCustomerCode("CUS_delta");
    const payload = dvaTransfer({
      id: "evt_4",
      reference: "dva_txn_4",
      amountKobo: 900_000,
      customerCode: "CUS_stranger",
    });

    const result = await payments.handleWebhook(payload, sign(payload));

    expect(result.message).toBe("Webhook processed");
    expect(await balanceOf(wallet.id)).toBe(0);
  });

  it("credits nothing when the transfer carries no customer code", async () => {
    const wallet = await walletWithCustomerCode("CUS_epsilon");
    const payload = dvaTransfer({
      id: "evt_5",
      reference: "dva_txn_5",
      amountKobo: 900_000,
    });

    const result = await payments.handleWebhook(payload, sign(payload));

    expect(result.message).toBe("Webhook processed");
    expect(await balanceOf(wallet.id)).toBe(0);
  });

  it("rejects a payload whose signature does not match", async () => {
    const wallet = await walletWithCustomerCode("CUS_zeta");
    const payload = dvaTransfer({
      id: "evt_6",
      reference: "dva_txn_6",
      amountKobo: 700_000,
      customerCode: "CUS_zeta",
    });

    await expect(
      payments.handleWebhook(payload, "not-the-signature"),
    ).rejects.toThrow();

    expect(await balanceOf(wallet.id)).toBe(0);
  });

  /*
   * A checkout paid by card is also a charge.success against the same handler.
   * It must keep taking the order branch and must not reach the wallet.
   */
  it("leaves a buyer order payment on its own branch", async () => {
    const wallet = await walletWithCustomerCode("CUS_eta");
    const payload = {
      event: "charge.success",
      data: {
        id: "evt_7",
        reference: "order_txn_7",
        amount: 3_000_000,
        channel: "card",
        customer: { customer_code: "CUS_eta" },
        metadata: { type: "buyer_order", order_id: 999_999, buyer_id: userId },
      },
    };

    await payments.handleWebhook(payload, sign(payload));

    expect(await balanceOf(wallet.id)).toBe(0);
  });
});
