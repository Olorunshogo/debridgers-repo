import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, count, sum, and, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { NotificationsService } from "../buyer/notifications.service";
import { LedgerService } from "../payment/ledger.service";

@Injectable()
export class WalletService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationsService: NotificationsService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Get or create buyer wallet
   */
  async getOrCreateWallet(userId: number) {
    return this.ledger.getOrCreateWallet(userId);
  }

  /**
   * Get wallet with transaction history
   */
  async getWalletWithTransactions(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const offset = (page - 1) * limit;

    const [transactions, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.walletTransactions)
        .where(eq(schema.walletTransactions.wallet_id, wallet.id))
        .orderBy(desc(schema.walletTransactions.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.walletTransactions)
        .where(eq(schema.walletTransactions.wallet_id, wallet.id)),
    ]);

    return {
      wallet: {
        id: wallet.id,
        available_balance: wallet.available_balance,
        pending_balance: wallet.pending_balance,
        total_deposited: wallet.total_deposited,
      },
      transactions,
      pagination: {
        page,
        limit,
        total: Number(total),
      },
    };
  }

  /**
   * Deduct from wallet (for payment)
   */
  async deductBalance(userId: number, amount: number) {
    const wallet = await this.ledger.getOrCreateWallet(userId);

    const { wallet: updated } = await this.ledger.debit(wallet.id, {
      type: "withdraw",
      amount,
      description: "Payment for order",
    });

    return updated;
  }

  /**
   * Add to wallet (for deposit)
   */
  async addBalance(userId: number, amount: number, reference: string) {
    const wallet = await this.ledger.getOrCreateWallet(userId);

    const { wallet: updated } = await this.ledger.credit(
      wallet.id,
      {
        type: "deposit",
        amount,
        reference,
        description: "Deposit via Paystack",
      },
      true,
    );

    return updated;
  }

  /**
   * Create pending transaction (for Paystack deposit)
   */
  async createPendingTransaction(
    userId: number,
    amount: number,
    reference: string,
  ) {
    const wallet = await this.ledger.getOrCreateWallet(userId);

    return this.ledger.recordEntry(wallet.id, {
      type: "deposit",
      amount,
      status: "pending",
      reference,
      description: "Deposit initiated via Paystack",
    });
  }

  /**
   * Confirm pending transaction
   */
  async confirmTransaction(reference: string, _amount?: number) {
    /*
     * Reachable from two places at once: the buyer posting to
     * /deposit/confirm and Paystack's charge.success webhook. The ledger's
     * pending-to-completed flip is the lock, so only one of them credits.
     */
    const settled = await this.ledger.settlePendingCredit(reference, true);

    if (!settled) {
      const existing = await this.ledger.findEntryByReference(reference);

      if (!existing) {
        throw new NotFoundException("Transaction not found");
      }

      return existing; // Already confirmed by the other caller
    }

    await this.notificationsService.notifyWalletTransaction(
      settled.wallet.user_id,
      "deposit",
      settled.transaction.amount,
      "completed",
    );

    return settled.transaction;
  }

  async getTransactionByReference(reference: string) {
    const [transaction] = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.reference, reference))
      .limit(1);

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return transaction;
  }

  /*
   * Resolves the wallet a transaction belongs to, plus its owner, so callers do
   * not have to guess the user. The confirm handler used to hardcode user 1,
   * which reported a stranger's wallet back to whoever deposited.
   */
  async getWalletWithOwner(walletId: number) {
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, walletId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    const [owner] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        first_name: schema.users.first_name,
      })
      .from(schema.users)
      .where(eq(schema.users.id, wallet.user_id))
      .limit(1);

    return { wallet, owner };
  }

  /**
   * Update transaction with Paystack reference
   */
  async updateTransactionReference(
    transactionId: number,
    paystackReference: string,
  ) {
    await this.db
      .update(schema.walletTransactions)
      .set({ reference: paystackReference })
      .where(eq(schema.walletTransactions.id, transactionId));
  }

  /**
   * Validate amount
   */
  validateAmount(amount: number) {
    const MIN_AMOUNT = 20000; // ₦200 (test mode)
    const MAX_AMOUNT = 10000000; // ₦100,000

    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      throw new BadRequestException(
        `Amount must be between ₦${MIN_AMOUNT / 100} and ₦${MAX_AMOUNT / 100}`,
      );
    }
  }

  /**
   * Get transaction history with filters
   */
  async getTransactionHistory(
    userId: number,
    filters?: {
      type?: "deposit" | "withdraw" | "refund";
      status?: "pending" | "completed" | "failed";
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const {
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters || {};
    const offset = (page - 1) * limit;

    const whereConditions = [
      eq(schema.walletTransactions.wallet_id, wallet.id),
    ];

    if (type) {
      whereConditions.push(eq(schema.walletTransactions.type, type));
    }
    if (status) {
      whereConditions.push(eq(schema.walletTransactions.status, status));
    }
    if (startDate) {
      whereConditions.push(
        sql`${schema.walletTransactions.created_at} >= ${startDate}`,
      );
    }
    if (endDate) {
      whereConditions.push(
        sql`${schema.walletTransactions.created_at} <= ${endDate}`,
      );
    }

    const queryResult = await Promise.all([
      this.db
        .select()
        .from(schema.walletTransactions)
        .where(and(...(whereConditions as Parameters<typeof and>)))
        .orderBy(desc(schema.walletTransactions.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.walletTransactions)
        .where(and(...(whereConditions as Parameters<typeof and>))),
    ]);

    const [transactions, countResult] = queryResult;
    const totalCount =
      Array.isArray(countResult) && countResult.length > 0
        ? (countResult[0] as unknown as { total: number }).total
        : 0;

    return {
      transactions,
      pagination: { page, limit, total: totalCount },
    };
  }

  /**
   * Get wallet balance summary
   */
  async getWalletSummary(userId: number) {
    const wallet = await this.getOrCreateWallet(userId);

    const [withdrawSum] = await this.db
      .select({ total: sum(schema.walletTransactions.amount) })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.wallet_id, wallet.id),
          eq(schema.walletTransactions.type, "withdraw"),
          eq(schema.walletTransactions.status, "completed"),
        ),
      );

    return {
      available_balance: wallet.available_balance,
      pending_balance: wallet.pending_balance,
      total_deposited: wallet.total_deposited,
      total_withdrawn: withdrawSum?.total ?? 0,
      total_spent: withdrawSum?.total ?? 0,
    };
  }
}
