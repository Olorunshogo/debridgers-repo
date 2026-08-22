import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { LedgerService } from "./ledger.service";
import * as schema from "../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../test/db";

/*
 * The ledger is the only thing in the system allowed to move a buyer's money,
 * so its guarantees are the ones worth proving. Every one of them is enforced
 * by SQL rather than by TypeScript - the overdraw check is an UPDATE predicate
 * and the deposit lock is a conditional status flip - which is why these run
 * against a real Postgres. A mocked query builder could not tell an overdraw
 * from a correct debit.
 */

const hasDb = await databaseAvailable();

describe.skipIf(!hasDb)("LedgerService", () => {
  let t: TestDb;
  let ledger: LedgerService;
  let userId: number;

  beforeAll(async () => {
    t = await createTestDatabase("ledger");
    ledger = new LedgerService(t.db);
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

  async function walletWithBalance(kobo: number) {
    const wallet = await ledger.getOrCreateWallet(userId);
    if (kobo > 0) {
      await t.db
        .update(schema.buyerWallets)
        .set({ available_balance: kobo })
        .where(eq(schema.buyerWallets.id, wallet.id));
    }
    return wallet;
  }

  async function balanceOf(walletId: number): Promise<number> {
    const [row] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, walletId));
    return row.available_balance;
  }

  // === Wallet creation

  it("creates a wallet once and returns the same one after", async () => {
    const first = await ledger.getOrCreateWallet(userId);
    const second = await ledger.getOrCreateWallet(userId);

    expect(second.id).toBe(first.id);
    expect(first.available_balance).toBe(0);
  });

  // === Overdraw

  it("refuses a debit larger than the balance and leaves it untouched", async () => {
    const wallet = await walletWithBalance(5_000);

    const result = await ledger.applyDebit(wallet.id, 5_001);

    expect(result).toBeUndefined();
    expect(await balanceOf(wallet.id)).toBe(5_000);
  });

  it("allows a debit for the exact balance", async () => {
    const wallet = await walletWithBalance(5_000);

    const result = await ledger.applyDebit(wallet.id, 5_000);

    expect(result).toBeDefined();
    expect(await balanceOf(wallet.id)).toBe(0);
  });

  /*
   * The case a read-then-write check cannot survive. Both debits see a
   * sufficient balance if they SELECT first; only one may actually apply.
   */
  it("cannot be overdrawn by two debits racing for the same funds", async () => {
    const wallet = await walletWithBalance(10_000);

    const results = await Promise.all([
      ledger.applyDebit(wallet.id, 7_000),
      ledger.applyDebit(wallet.id, 7_000),
    ]);

    const applied = results.filter((r) => r !== undefined);
    expect(applied).toHaveLength(1);
    expect(await balanceOf(wallet.id)).toBe(3_000);
  });

  it("throws rather than debiting when funds are short", async () => {
    const wallet = await walletWithBalance(1_000);

    await expect(
      ledger.debit(wallet.id, { type: "withdraw", amount: 2_000 }),
    ).rejects.toThrow(/Insufficient wallet balance/i);

    expect(await balanceOf(wallet.id)).toBe(1_000);
  });

  it("writes no ledger row when a debit is refused", async () => {
    const wallet = await walletWithBalance(1_000);

    await expect(
      ledger.debit(wallet.id, { type: "withdraw", amount: 2_000 }),
    ).rejects.toThrow();

    const rows = await t.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.wallet_id, wallet.id));

    expect(rows).toHaveLength(0);
  });

  // === Credit and the lifetime deposit figure

  it("credits without touching total_deposited by default", async () => {
    const wallet = await walletWithBalance(0);

    await ledger.applyCredit(wallet.id, 4_000);

    const [row] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, wallet.id));

    expect(row.available_balance).toBe(4_000);
    /* A refund or a withdrawal reversal is not a deposit. */
    expect(row.total_deposited).toBe(0);
  });

  it("moves total_deposited only when the credit is a deposit", async () => {
    const wallet = await walletWithBalance(0);

    await ledger.applyCredit(wallet.id, 4_000, true);

    const [row] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, wallet.id));

    expect(row.available_balance).toBe(4_000);
    expect(row.total_deposited).toBe(4_000);
  });

  // === Amount validation

  it.each([0, -1, 1.5, NaN])("rejects %s as an amount", async (amount) => {
    const wallet = await walletWithBalance(10_000);

    await expect(ledger.applyDebit(wallet.id, amount)).rejects.toThrow(
      /positive integer/i,
    );
    await expect(ledger.applyCredit(wallet.id, amount)).rejects.toThrow(
      /positive integer/i,
    );
  });

  // === Deposit settlement: the double-credit guard

  it("settles a pending deposit exactly once", async () => {
    const wallet = await walletWithBalance(0);
    await ledger.recordEntry(wallet.id, {
      type: "deposit",
      amount: 25_000,
      status: "pending",
      reference: "ref_settle_once",
    });

    const first = await ledger.settlePendingCredit("ref_settle_once", true);
    const second = await ledger.settlePendingCredit("ref_settle_once", true);

    expect(first).toBeDefined();
    /* The second caller - webhook or buyer-triggered confirm - must get nothing
       and must not have credited the wallet again. */
    expect(second).toBeUndefined();
    expect(await balanceOf(wallet.id)).toBe(25_000);
  });

  it("credits once when the webhook and the buyer confirm at the same moment", async () => {
    const wallet = await walletWithBalance(0);
    await ledger.recordEntry(wallet.id, {
      type: "deposit",
      amount: 30_000,
      status: "pending",
      reference: "ref_race",
    });

    const [a, b] = await Promise.all([
      ledger.settlePendingCredit("ref_race", true),
      ledger.settlePendingCredit("ref_race", true),
    ]);

    expect([a, b].filter((r) => r !== undefined)).toHaveLength(1);
    expect(await balanceOf(wallet.id)).toBe(30_000);
  });

  it("only one caller can claim a pending entry", async () => {
    const wallet = await walletWithBalance(0);
    await ledger.recordEntry(wallet.id, {
      type: "deposit",
      amount: 1_000,
      status: "pending",
      reference: "ref_claim",
    });

    const first = await ledger.claimPendingEntry("ref_claim");
    const second = await ledger.claimPendingEntry("ref_claim");

    expect(first?.status).toBe("completed");
    expect(second).toBeUndefined();
  });

  it("does not settle a reference that was never recorded", async () => {
    const wallet = await walletWithBalance(0);

    const result = await ledger.settlePendingCredit("ref_unknown", true);

    expect(result).toBeUndefined();
    expect(await balanceOf(wallet.id)).toBe(0);
  });

  // === Reversal

  it("returns the money and marks the original entry failed", async () => {
    const wallet = await walletWithBalance(10_000);
    const { transaction } = await ledger.debit(wallet.id, {
      type: "withdraw",
      amount: 4_000,
    });
    expect(await balanceOf(wallet.id)).toBe(6_000);

    await ledger.reverseEntry(transaction.id, wallet.id, 4_000);

    expect(await balanceOf(wallet.id)).toBe(10_000);

    const [row] = await t.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.id, transaction.id));
    expect(row.status).toBe("failed");

    /* A reversal is not a deposit. */
    const [w] = await t.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, wallet.id));
    expect(w.total_deposited).toBe(0);
  });
});
