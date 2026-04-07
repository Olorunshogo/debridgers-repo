import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@Injectable()
export class WalletService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getWallet(user: JwtPayload) {
    const [wallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, user.sub))
      .limit(1);

    if (!wallet) throw new NotFoundException("Wallet not found");

    return { message: "Wallet retrieved", data: wallet };
  }

  // Internal — called by other services to credit the wallet
  async credit(
    agentId: number,
    amount: number, // in kobo
    opts: { pending?: boolean } = {},
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, agentId))
      .limit(1);

    if (!existing) return; // wallet not created yet (agent not approved)

    if (opts.pending) {
      await this.db
        .update(schema.wallets)
        .set({
          pending_balance: existing.pending_balance + amount,
          total_earned: existing.total_earned + amount,
          updated_at: new Date(),
        })
        .where(eq(schema.wallets.agent_id, agentId));
    } else {
      await this.db
        .update(schema.wallets)
        .set({
          available_balance: existing.available_balance + amount,
          total_earned: existing.total_earned + amount,
          updated_at: new Date(),
        })
        .where(eq(schema.wallets.agent_id, agentId));
    }
  }

  // Internal — move amount from pending to available (on delivery confirmation)
  async confirmPending(agentId: number, amount: number) {
    const [existing] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, agentId))
      .limit(1);

    if (!existing) return;

    await this.db
      .update(schema.wallets)
      .set({
        pending_balance: Math.max(0, existing.pending_balance - amount),
        available_balance: existing.available_balance + amount,
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId));
  }

  // Internal — debit available balance (on withdrawal)
  async debit(agentId: number, amount: number) {
    const [existing] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, agentId))
      .limit(1);

    if (!existing) return;

    await this.db
      .update(schema.wallets)
      .set({
        available_balance: Math.max(0, existing.available_balance - amount),
        updated_at: new Date(),
      })
      .where(eq(schema.wallets.agent_id, agentId));
  }
}
