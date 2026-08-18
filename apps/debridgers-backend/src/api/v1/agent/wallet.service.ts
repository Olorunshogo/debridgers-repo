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
 * Every balance change here is expressed relative to the stored value in SQL
 * rather than read into JS, adjusted and written back. A read-then-write loses
 * one of two concurrent updates: both read the same figure and the second
 * overwrites the first, so an agent could be credited twice and keep one
 * amount, or withdraw twice and be debited once.
 */
@Injectable()
export class WalletService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async getWallet(user: JwtPayload) {
    const [wallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, user.sub))
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

  // Internal - called by other services to credit the wallet
  async credit(
    agentId: number,
    amount: number, // in kobo
    opts: { pending?: boolean } = {},
    exec: WalletExecutor = this.db,
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
      .where(eq(schema.wallets.agent_id, agentId));
  }

  // Internal - move amount from pending to available (on delivery confirmation)
  async confirmPending(
    agentId: number,
    amount: number,
    exec: WalletExecutor = this.db,
  ): Promise<void> {
    await exec
      .update(schema.wallets)
      .set({
        // GREATEST keeps the clamp the previous Math.max provided.
        pending_balance: sql`GREATEST(${schema.wallets.pending_balance} - ${amount}, 0)`,
        available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId));
  }

  /*
   * Internal - return money to available balance after a rejected payout.
   *
   * Deliberately not `credit`: that also increases `total_earned`, and handing
   * back money the agent already earned is not a new earning. Using credit here
   * would inflate lifetime earnings every time a payout was rejected.
   */
  async refundAvailable(
    agentId: number,
    amount: number,
    exec: WalletExecutor = this.db,
  ): Promise<void> {
    await exec
      .update(schema.wallets)
      .set({
        available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId));
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
  ): Promise<boolean> {
    const updated = await exec
      .update(schema.wallets)
      .set({
        available_balance: sql`${schema.wallets.available_balance} - ${amount}`,
        updated_at: new Date(),
      })
      .where(
        sql`${schema.wallets.agent_id} = ${agentId} AND ${schema.wallets.available_balance} >= ${amount}`,
      )
      .returning();

    return updated.length > 0;
  }
}
