import { Inject, Injectable } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";

type Database = NodePgDatabase<typeof schema>;

/*
 * Callers that already opened a transaction pass it in so the balance move
 * commits with whatever row justifies it, such as a withdrawal request.
 */
export type WalletExecutor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

/*
 * `reference` ties a ledger row back to the row that justified it (e.g.
 * "commission:91", "withdrawal:37") and is unique, so a caller that retries
 * after a crash cannot double-log the same balance move. `description` is
 * optional free text for the admin-facing ledger view.
 */
export interface LedgerEntry {
  reference: string;
  description?: string;
}

/*
 * Every balance change here is expressed relative to the stored value in SQL
 * rather than read into JS, adjusted and written back. A read-then-write loses
 * one of two concurrent updates: both read the same figure and the second
 * overwrites the first, so an agent could be credited twice and keep one
 * amount, or withdraw twice and be debited once.
 */
@Injectable()
export class AgentWalletService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async getWallet(user: JwtPayload) {
    const [wallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.user_id, user.sub))
      .limit(1);

    if (!wallet) {
      return {
        message: "Wallet retrieved",
        data: {
          id: null,
          agent_id: user.sub,
          available_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          updated_at: null,
        },
      };
    }

    return { message: "Wallet retrieved", data: wallet };
  }

  private async logEntry(
    agentId: number,
    type: (typeof schema.agentWalletTransactionTypeEnum.enumValues)[number],
    amount: number,
    entry: LedgerEntry,
    exec: WalletExecutor,
  ): Promise<void> {
    const [wallet] = await exec
      .select({ id: schema.wallets.id })
      .from(schema.wallets)
      .where(eq(schema.wallets.user_id, agentId))
      .limit(1);

    if (!wallet) return;

    await exec
      .insert(schema.agentWalletTransactions)
      .values({
        wallet_id: wallet.id,
        type,
        amount,
        reference: entry.reference,
        description: entry.description,
      })
      .onConflictDoNothing();
  }

  // Internal - called by other services to credit the wallet. amount is in kobo.
  async credit(
    agentId: number,
    amount: number,
    opts: { pending?: boolean } = {},
    exec: WalletExecutor = this.db,
    entry?: LedgerEntry,
  ): Promise<void> {
    // No row means the agent is not approved yet, so there is nothing to credit.
    await exec
      .update(schema.wallets)
      .set(
        opts.pending
          ? {
              pending_balance: sql`${schema.wallets.pending_balance} + ${amount}`,
              total_earned: sql`${schema.wallets.total_earned} + ${amount}`,
              updated_at: new Date(),
            }
          : {
              available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
              total_earned: sql`${schema.wallets.total_earned} + ${amount}`,
              updated_at: new Date(),
            },
      )
      .where(eq(schema.wallets.user_id, agentId));

    if (entry) await this.logEntry(agentId, "credit", amount, entry, exec);
  }

  // Internal - move amount from pending to available (on delivery confirmation)
  async confirmPending(
    agentId: number,
    amount: number,
    exec: WalletExecutor = this.db,
    entry?: LedgerEntry,
  ): Promise<void> {
    await exec
      .update(schema.wallets)
      .set({
        // GREATEST keeps the clamp the previous Math.max provided.
        pending_balance: sql`GREATEST(${schema.wallets.pending_balance} - ${amount}, 0)`,
        available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.user_id, agentId));

    if (entry) await this.logEntry(agentId, "confirm", amount, entry, exec);
  }

  /*
   * Internal - return money to available balance after a rejected/failed payout.
   *
   * Deliberately not `credit`: that also increases `total_earned`, and handing
   * back money the agent already earned is not a new earning. Using credit here
   * would inflate lifetime earnings every time a payout was rejected.
   */
  async refundAvailable(
    agentId: number,
    amount: number,
    exec: WalletExecutor = this.db,
    entry?: LedgerEntry,
  ): Promise<void> {
    await exec
      .update(schema.wallets)
      .set({
        available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.user_id, agentId));

    if (entry) await this.logEntry(agentId, "refund", amount, entry, exec);
  }

  /*
   * Internal - debit available balance (on withdrawal).
   *
   * The balance check is the UPDATE's own predicate, so two concurrent
   * withdrawals cannot both pass it. Returns false when the wallet could not
   * cover the amount, which the caller must treat as a refusal: the previous
   * version clamped at zero instead, which silently turned an overdraw into a
   * free withdrawal.
   */
  async debit(
    agentId: number,
    amount: number,
    exec: WalletExecutor = this.db,
    entry?: LedgerEntry,
  ): Promise<boolean> {
    const updated = await exec
      .update(schema.wallets)
      .set({
        available_balance: sql`${schema.wallets.available_balance} - ${amount}`,
        updated_at: new Date(),
      })
      .where(
        sql`${schema.wallets.user_id} = ${agentId} AND ${schema.wallets.available_balance} >= ${amount}`,
      )
      .returning();

    if (updated.length > 0 && entry) {
      await this.logEntry(agentId, "debit", amount, entry, exec);
    }

    return updated.length > 0;
  }

  /*
   * Internal - claw back a commission that was reversed after a refund or
   * dispute. `fromPending` mirrors where the money actually sits: a "direct"
   * commission not yet marked paid is still in pending_balance and total_earned
   * never should have counted it, so both get pulled back with the same
   * GREATEST(...,0) clamp `confirmPending` uses. A commission already moved to
   * available_balance (paid, or an override credited straight there) is
   * deliberately NOT clamped at zero: the agent may already have withdrawn it,
   * and clamping would erase the shortfall instead of carrying it as a debt
   * against the agent's future earnings.
   */
  async reverseCredit(
    agentId: number,
    amount: number,
    opts: { fromPending: boolean },
    exec: WalletExecutor = this.db,
    entry?: LedgerEntry,
  ): Promise<void> {
    await exec
      .update(schema.wallets)
      .set(
        opts.fromPending
          ? {
              pending_balance: sql`GREATEST(${schema.wallets.pending_balance} - ${amount}, 0)`,
              total_earned: sql`GREATEST(${schema.wallets.total_earned} - ${amount}, 0)`,
              updated_at: new Date(),
            }
          : {
              available_balance: sql`${schema.wallets.available_balance} - ${amount}`,
              total_earned: sql`GREATEST(${schema.wallets.total_earned} - ${amount}, 0)`,
              updated_at: new Date(),
            },
      )
      .where(eq(schema.wallets.user_id, agentId));

    if (entry) await this.logEntry(agentId, "reversal", amount, entry, exec);
  }
}
