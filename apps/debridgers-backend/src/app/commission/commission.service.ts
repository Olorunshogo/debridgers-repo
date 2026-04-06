import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, gte, lt, sum } from "drizzle-orm";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { WalletService } from "../agent/wallet.service";

const AGENT_OVERRIDE_RATE = 0.05; // 5% of recruited agent's monthly earnings
const STATE_MANAGER_RATE = 0.02; // 2% of all agents in managed state

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly walletService: WalletService,
  ) {}

  // Runs at midnight on the 1st of every month
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async runMonthlyReferralCommissions() {
    this.logger.log("Running monthly referral commission calculation...");

    const now = new Date();
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all approved agents who have a recruiter (layer 2 referral)
    const recruitedAgents = await this.db
      .select({
        agent_id: schema.agent_profiles.user_id,
        recruiter_id: schema.agent_profiles.referred_by_agent_id,
      })
      .from(schema.agent_profiles)
      .where(and(eq(schema.agent_profiles.status, "approved")));

    for (const { agent_id, recruiter_id } of recruitedAgents) {
      if (!recruiter_id) continue;

      // Sum this agent's confirmed commissions for last month
      const [earningsRow] = await this.db
        .select({ total: sum(schema.commissions.amount) })
        .from(schema.commissions)
        .where(
          and(
            eq(schema.commissions.agent_id, agent_id),
            eq(schema.commissions.status, "confirmed"),
            gte(schema.commissions.created_at, firstOfLastMonth),
            lt(schema.commissions.created_at, firstOfThisMonth),
          ),
        );

      const agentEarnings = Number(earningsRow?.total ?? 0);
      if (agentEarnings <= 0) continue;

      const overrideAmount = Math.round(
        agentEarnings * AGENT_OVERRIDE_RATE * 100,
      ); // kobo

      // Create commission record for recruiter
      await this.db.insert(schema.commissions).values({
        agent_id: recruiter_id,
        type: "agent_override",
        amount: String(overrideAmount / 100), // back to naira
        status: "confirmed",
      });

      await this.walletService.credit(recruiter_id, overrideAmount, {
        pending: false,
      });

      this.logger.log(
        `Agent override: ₦${overrideAmount / 100} credited to agent ${recruiter_id} from agent ${agent_id}`,
      );
    }

    // State manager overrides — 2% from all agents in their managed state
    const stateManagers = await this.db
      .select({
        manager_id: schema.agent_profiles.user_id,
        managed_state: schema.agent_profiles.managed_state,
      })
      .from(schema.agent_profiles)
      .where(
        and(
          eq(schema.agent_profiles.is_state_manager, true),
          eq(schema.agent_profiles.status, "approved"),
        ),
      );

    for (const { manager_id, managed_state } of stateManagers) {
      if (!managed_state) continue;

      // Get all agents in this state (excluding the manager)
      const stateAgents = await this.db
        .select({ user_id: schema.agent_profiles.user_id })
        .from(schema.agent_profiles)
        .where(
          and(
            eq(schema.agent_profiles.state, managed_state),
            eq(schema.agent_profiles.status, "approved"),
          ),
        );

      for (const { user_id } of stateAgents) {
        if (user_id === manager_id) continue;

        const [earningsRow] = await this.db
          .select({ total: sum(schema.commissions.amount) })
          .from(schema.commissions)
          .where(
            and(
              eq(schema.commissions.agent_id, user_id),
              eq(schema.commissions.status, "confirmed"),
              gte(schema.commissions.created_at, firstOfLastMonth),
              lt(schema.commissions.created_at, firstOfThisMonth),
            ),
          );

        const agentEarnings = Number(earningsRow?.total ?? 0);
        if (agentEarnings <= 0) continue;

        const overrideAmount = Math.round(
          agentEarnings * STATE_MANAGER_RATE * 100,
        ); // kobo

        await this.db.insert(schema.commissions).values({
          agent_id: manager_id,
          type: "state_manager_override",
          amount: String(overrideAmount / 100),
          status: "confirmed",
        });

        await this.walletService.credit(manager_id, overrideAmount, {
          pending: false,
        });

        this.logger.log(
          `State manager override: ₦${overrideAmount / 100} credited to manager ${manager_id} from agent ${user_id}`,
        );
      }
    }

    this.logger.log("Monthly referral commission calculation complete.");
  }
}
