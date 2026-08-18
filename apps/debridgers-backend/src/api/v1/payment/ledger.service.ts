import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

// === Types

type Database = NodePgDatabase<typeof schema>;

/*
 * Callers that already opened a drizzle transaction pass it in so the balance
 * move and its ledger row commit together. Everything else gets the pooled
 * handle and each statement stands alone.
 */
export type LedgerExecutor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

export type LedgerEntryType = "deposit" | "withdraw" | "refund";
export type LedgerEntryStatus = "pending" | "completed" | "failed";

export interface LedgerEntry {
  type: LedgerEntryType;
  amount: number;
  status: LedgerEntryStatus;
  reference?: string | null;
  description?: string | null;
}

export type BuyerWallet = typeof schema.buyerWallets.$inferSelect;
export type WalletTransaction = typeof schema.walletTransactions.$inferSelect;

/*
 * Every buyer wallet balance change in the system goes through this service.
 * Nothing else may write buyerWallets.available_balance or insert into
 * walletTransactions, so the overdraw guard and the kobo units have exactly
 * one implementation to audit and one place to test.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  // === Wallets

  async getOrCreateWallet(
    userId: number,
    exec: LedgerExecutor = this.db,
  ): Promise<BuyerWallet> {
    const [existing] = await exec
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (existing) return existing;

    const [created] = await exec
      .insert(schema.buyerWallets)
      .values({ user_id: userId })
      .returning();

    return created;
  }

  async getWalletById(
    walletId: number,
    exec: LedgerExecutor = this.db,
  ): Promise<BuyerWallet | undefined> {
    const [wallet] = await exec
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, walletId))
      .limit(1);

    return wallet;
  }

  // === Balance primitives

  /*
   * The balance check is the UPDATE's own predicate, never a prior SELECT. Two
   * debits landing at the same moment would both pass a read-then-write check
   * and overdraw the wallet; here the second one matches no row and comes back
   * undefined.
   */
  async applyDebit(
    walletId: number,
    amount: number,
    exec: LedgerExecutor = this.db,
  ): Promise<BuyerWallet | undefined> {
    this.assertPositive(amount);

    const [updated] = await exec
      .update(schema.buyerWallets)
      .set({
        available_balance: sql`${schema.buyerWallets.available_balance} - ${amount}`,
      })
      .where(
        sql`${schema.buyerWallets.id} = ${walletId} AND ${schema.buyerWallets.available_balance} >= ${amount}`,
      )
      .returning();

    return updated;
  }

  /*
   * `countsAsDeposit` also moves total_deposited, which is a lifetime figure
   * that must not grow on a withdrawal reversal or an order refund.
   */
  async applyCredit(
    walletId: number,
    amount: number,
    countsAsDeposit = false,
    exec: LedgerExecutor = this.db,
  ): Promise<BuyerWallet | undefined> {
    this.assertPositive(amount);

    const [updated] = await exec
      .update(schema.buyerWallets)
      .set(
        countsAsDeposit
          ? {
              available_balance: sql`${schema.buyerWallets.available_balance} + ${amount}`,
              total_deposited: sql`${schema.buyerWallets.total_deposited} + ${amount}`,
            }
          : {
              available_balance: sql`${schema.buyerWallets.available_balance} + ${amount}`,
            },
      )
      .where(eq(schema.buyerWallets.id, walletId))
      .returning();

    return updated;
  }

  // === Ledger rows

  async recordEntry(
    walletId: number,
    entry: LedgerEntry,
    exec: LedgerExecutor = this.db,
  ): Promise<WalletTransaction> {
    this.assertPositive(entry.amount);

    const [row] = await exec
      .insert(schema.walletTransactions)
      .values({
        wallet_id: walletId,
        type: entry.type,
        amount: entry.amount,
        status: entry.status,
        reference: entry.reference ?? null,
        description: entry.description ?? null,
      })
      .returning();

    return row;
  }

  async markEntry(
    transactionId: number,
    status: LedgerEntryStatus,
    exec: LedgerExecutor = this.db,
  ): Promise<void> {
    await exec
      .update(schema.walletTransactions)
      .set({ status })
      .where(eq(schema.walletTransactions.id, transactionId));
  }

  async findEntryByReference(
    reference: string,
    exec: LedgerExecutor = this.db,
  ): Promise<WalletTransaction | undefined> {
    const [row] = await exec
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.reference, reference))
      .limit(1);

    return row;
  }

  /*
   * Flipping pending to completed IS the lock. A deposit reference is
   * confirmable from two directions at once, the buyer posting to
   * /deposit/confirm and Paystack's charge.success webhook, and only the
   * caller whose UPDATE actually matches a still-pending row may credit the
   * wallet. The loser gets undefined and must not touch the balance.
   */
  async claimPendingEntry(
    reference: string,
    exec: LedgerExecutor = this.db,
  ): Promise<WalletTransaction | undefined> {
    const [claimed] = await exec
      .update(schema.walletTransactions)
      .set({ status: "completed" })
      .where(
        and(
          eq(schema.walletTransactions.reference, reference),
          eq(schema.walletTransactions.status, "pending"),
        ),
      )
      .returning();

    return claimed;
  }

  // === Composed operations

  /* Debit and its ledger row, atomic. Throws when the wallet cannot cover it. */
  async debit(
    walletId: number,
    entry: Omit<LedgerEntry, "status">,
    exec?: LedgerExecutor,
  ): Promise<{ wallet: BuyerWallet; transaction: WalletTransaction }> {
    const run = async (
      tx: LedgerExecutor,
    ): Promise<{ wallet: BuyerWallet; transaction: WalletTransaction }> => {
      const wallet = await this.applyDebit(walletId, entry.amount, tx);

      if (!wallet) {
        throw new BadRequestException("Insufficient wallet balance");
      }

      const transaction = await this.recordEntry(
        walletId,
        { ...entry, status: "completed" },
        tx,
      );

      return { wallet, transaction };
    };

    return exec ? run(exec) : this.db.transaction(run);
  }

  /* Credit and its ledger row, atomic. */
  async credit(
    walletId: number,
    entry: Omit<LedgerEntry, "status">,
    countsAsDeposit = false,
    exec?: LedgerExecutor,
  ): Promise<{ wallet: BuyerWallet; transaction: WalletTransaction }> {
    const run = async (
      tx: LedgerExecutor,
    ): Promise<{ wallet: BuyerWallet; transaction: WalletTransaction }> => {
      const wallet = await this.applyCredit(
        walletId,
        entry.amount,
        countsAsDeposit,
        tx,
      );

      if (!wallet) {
        throw new BadRequestException("Wallet not found");
      }

      const transaction = await this.recordEntry(
        walletId,
        { ...entry, status: "completed" },
        tx,
      );

      return { wallet, transaction };
    };

    return exec ? run(exec) : this.db.transaction(run);
  }

  /*
   * Settle a previously recorded pending entry by crediting the wallet for it.
   * Returns undefined when another caller already claimed the reference, which
   * is the idempotency guarantee the deposit path depends on.
   */
  async settlePendingCredit(
    reference: string,
    countsAsDeposit = false,
  ): Promise<
    { wallet: BuyerWallet; transaction: WalletTransaction } | undefined
  > {
    return this.db.transaction(async (tx) => {
      const claimed = await this.claimPendingEntry(reference, tx);
      if (!claimed) return undefined;

      const wallet = await this.applyCredit(
        claimed.wallet_id,
        claimed.amount,
        countsAsDeposit,
        tx,
      );

      if (!wallet) {
        throw new BadRequestException("Wallet not found");
      }

      return { wallet, transaction: claimed };
    });
  }

  /* Return a debited amount and mark the originating entry failed. */
  async reverseEntry(
    transactionId: number,
    walletId: number,
    amount: number,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.applyCredit(walletId, amount, false, tx);
      await this.markEntry(transactionId, "failed", tx);
    });

    this.logger.log(
      `Reversed ${amount} kobo to wallet ${walletId} for transaction ${transactionId}`,
    );
  }

  // === Helpers

  private assertPositive(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        `Ledger amounts must be a positive integer number of kobo, got ${amount}`,
      );
    }
  }
}
