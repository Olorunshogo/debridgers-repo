import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

type Database = NodePgDatabase<typeof schema>;

export type AgentLedgerExecutor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

export type AgentWallet = typeof schema.wallets.$inferSelect;

/*
 * Agent commission and withdrawal ledger. Mirrors LedgerService but for
 * the agent wallets table, which has different semantics: pending_balance
 * (pending commissions from in-flight orders), total_earned (lifetime),
 * available_balance (withdrawable). Both implement UPDATE-as-predicate
 * overdraw safety to prevent concurrent lost updates.
 */
@Injectable()
export class AgentLedgerService {
  private readonly logger = new Logger(AgentLedgerService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async getOrCreateWallet(
    agentId: number,
    exec: AgentLedgerExecutor = this.db,
  ): Promise<AgentWallet> {
    const [existing] = await exec
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, agentId))
      .limit(1);

    if (existing) return existing;

    const [created] = await exec
      .insert(schema.wallets)
      .values({ agent_id: agentId })
      .returning();

    return created;
  }

  async getWalletById(
    walletId: number,
    exec: AgentLedgerExecutor = this.db,
  ): Promise<AgentWallet | undefined> {
    const [wallet] = await exec
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.id, walletId))
      .limit(1);

    return wallet;
  }

  /*
   * Credit to pending balance (commission earned but order not yet delivered).
   * Increases both pending_balance and total_earned.
   */
  async creditPending(
    agentId: number,
    amount: number,
    exec: AgentLedgerExecutor = this.db,
  ): Promise<AgentWallet | undefined> {
    this.assertPositive(amount);

    const [updated] = await exec
      .update(schema.wallets)
      .set({
        pending_balance: sql`${schema.wallets.pending_balance} + ${amount}`,
        total_earned: sql`${schema.wallets.total_earned} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId))
      .returning();

    return updated;
  }

  /*
   * Confirm pending → available (order delivered, commission settled).
   * Moves from pending to available, total_earned unchanged.
   */
  async confirmPending(
    agentId: number,
    amount: number,
    exec: AgentLedgerExecutor = this.db,
  ): Promise<void> {
    this.assertPositive(amount);

    await exec
      .update(schema.wallets)
      .set({
        pending_balance: sql`GREATEST(0, ${schema.wallets.pending_balance} - ${amount})`,
        available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId));
  }

  /*
   * Debit available balance (withdrawal, with overdraw guard via predicate).
   * Returns undefined if insufficient balance, triggering caller error.
   */
  async debit(
    agentId: number,
    amount: number,
    exec: AgentLedgerExecutor = this.db,
  ): Promise<AgentWallet | undefined> {
    this.assertPositive(amount);

    const [updated] = await exec
      .update(schema.wallets)
      .set({
        available_balance: sql`${schema.wallets.available_balance} - ${amount}`,
        updated_at: new Date(),
      })
      .where(
        sql`${schema.wallets.agent_id} = ${agentId} AND ${schema.wallets.available_balance} >= ${amount}`,
      )
      .returning();

    return updated;
  }

  /*
   * Refund available balance (e.g., rejected withdrawal).
   * Does NOT increase total_earned — reversing already-earned commission.
   */
  async refundAvailable(
    agentId: number,
    amount: number,
    exec: AgentLedgerExecutor = this.db,
  ): Promise<void> {
    this.assertPositive(amount);

    await exec
      .update(schema.wallets)
      .set({
        available_balance: sql`${schema.wallets.available_balance} + ${amount}`,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId));
  }

  private assertPositive(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        `Agent ledger amounts must be a positive integer, got ${amount}`,
      );
    }
  }
}
