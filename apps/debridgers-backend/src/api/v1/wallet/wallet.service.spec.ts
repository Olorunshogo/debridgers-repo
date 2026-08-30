import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { WalletService } from "./wallet.service";
import { NotificationsService } from "../buyer/notifications.service";
import { LedgerService } from "../payment/ledger.service";
import * as schema from "../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../test/db";

/*
 * The deposit path, which is where a double credit would show up as free money.
 *
 * A Paystack reference is confirmable from two directions at once - the buyer
 * returning to /deposit/confirm, and the charge.success webhook - so the tests
 * that matter are the ones where both arrive.
 */

const hasDb = await databaseAvailable();

describe.skipIf(!hasDb)("WalletService deposits", () => {
  let t: TestDb;
  let wallets: WalletService;
  let ledger: LedgerService;
  let userId: number;

  beforeAll(async () => {
    t = await createTestDatabase("wallet");
    ledger = new LedgerService(t.db);
    wallets = new WalletService(t.db, new NotificationsService(t.db), ledger);
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();
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

  async function balance(): Promise<number> {
    const [row] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId));
    return row?.available_balance ?? 0;
  }

  it("leaves the balance alone until a deposit is confirmed", async () => {
    await wallets.createPendingTransaction(userId, 50_000, "ref_pending");

    expect(await balance()).toBe(0);
  });

  it("credits the wallet on confirmation", async () => {
    await wallets.createPendingTransaction(userId, 50_000, "ref_ok");

    await wallets.confirmTransaction("ref_ok");

    expect(await balance()).toBe(50_000);
  });

  it("credits once when the same reference is confirmed twice", async () => {
    await wallets.createPendingTransaction(userId, 50_000, "ref_twice");

    await wallets.confirmTransaction("ref_twice");
    await wallets.confirmTransaction("ref_twice");

    expect(await balance()).toBe(50_000);
  });

  it("credits once when the buyer and the webhook confirm together", async () => {
    await wallets.createPendingTransaction(userId, 75_000, "ref_both");

    await Promise.all([
      wallets.confirmTransaction("ref_both"),
      wallets.confirmTransaction("ref_both"),
    ]);

    expect(await balance()).toBe(75_000);
  });

  it("records exactly one ledger row for a twice-confirmed deposit", async () => {
    await wallets.createPendingTransaction(userId, 20_000, "ref_rows");
    await wallets.confirmTransaction("ref_rows");
    await wallets.confirmTransaction("ref_rows");

    const rows = await t.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.reference, "ref_rows"));

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("completed");
  });

  it("counts a confirmed deposit toward total_deposited", async () => {
    await wallets.createPendingTransaction(userId, 40_000, "ref_total");
    await wallets.confirmTransaction("ref_total");

    const [row] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId));

    expect(row.total_deposited).toBe(40_000);
  });

  it("rejects a reference that was never initiated", async () => {
    await expect(wallets.confirmTransaction("ref_never")).rejects.toThrow(
      /not found/i,
    );
    expect(await balance()).toBe(0);
  });

  // === Spending

  it("refuses to spend more than the wallet holds", async () => {
    await wallets.createPendingTransaction(userId, 10_000, "ref_fund");
    await wallets.confirmTransaction("ref_fund");

    await expect(wallets.deductBalance(userId, 10_001)).rejects.toThrow(
      /Insufficient wallet balance/i,
    );
    expect(await balance()).toBe(10_000);
  });

  it("spends down to zero but no further", async () => {
    await wallets.createPendingTransaction(userId, 10_000, "ref_spend");
    await wallets.confirmTransaction("ref_spend");

    await wallets.deductBalance(userId, 10_000);
    expect(await balance()).toBe(0);

    await expect(wallets.deductBalance(userId, 1)).rejects.toThrow();
  });

  it("does not let two concurrent spends overdraw the wallet", async () => {
    await wallets.createPendingTransaction(userId, 10_000, "ref_race_spend");
    await wallets.confirmTransaction("ref_race_spend");

    const results = await Promise.allSettled([
      wallets.deductBalance(userId, 8_000),
      wallets.deductBalance(userId, 8_000),
    ]);

    const settled = results.filter((r) => r.status === "fulfilled");
    expect(settled).toHaveLength(1);
    expect(await balance()).toBe(2_000);
  });
});
