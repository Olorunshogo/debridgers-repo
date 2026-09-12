import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, gte, lt, sum, inArray, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AgentWalletService } from "../wallet/agent-wallet.service";
import { SystemSettingsService } from "../settings/system-settings.service";
import { percentOfKobo } from "../../shared/money";

/*
 * Only these types count toward the base an override is calculated from.
 *
 * Overrides are deliberately excluded. Including them made every override pay
 * on top of previous overrides, so a recruiter earned a share of a share of a
 * share, compounding every month. The documented model is single level, and
 * this list is what makes the arithmetic match it.
 */
const OVERRIDE_BASE_TYPES = ["direct", "buyer_referral"] as const;

/*
 * Advisory lock key for the monthly run. Two instances calling this at the same
 * moment is otherwise a double payout, and a redeploy on the 1st is enough to
 * cause it.
 */
const MONTHLY_RUN_LOCK_KEY = 4_820_119;

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly walletService: AgentWalletService,
    private readonly settings: SystemSettingsService,
  ) {}

  // === Monthly overrides

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async runMonthlyReferralCommissions(): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const period = this.toPeriod(periodStart);

    /*
     * pg_try_advisory_lock returns immediately rather than queueing. A second
     * instance that cannot take the lock skips the run entirely, which is the
     * correct behaviour: the run is already happening somewhere else.
     */
    const lockResult = await this.db.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_lock(${MONTHLY_RUN_LOCK_KEY}) AS locked`,
    );

    if (!lockResult.rows[0]?.locked) {
      this.logger.warn(
        `Monthly commission run for ${period} skipped: another instance holds the lock`,
      );
      return;
    }

    try {
      this.logger.log(`Running monthly commission calculation for ${period}`);
      await this.payAgentOverrides(period, periodStart, periodEnd);
      await this.payStateManagerOverrides(period, periodStart, periodEnd);
      this.logger.log(`Monthly commission calculation for ${period} complete`);
    } finally {
      await this.db.execute(
        sql`SELECT pg_advisory_unlock(${MONTHLY_RUN_LOCK_KEY})`,
      );
    }
  }

  private async payAgentOverrides(
    period: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const rate = await this.settings.getAgentOverrideRate();

    const recruitedAgents = await this.db
      .select({
        agent_id: schema.agent_profiles.user_id,
        recruiter_id: schema.agent_profiles.referred_by_agent_id,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.status, "approved"));

    for (const { agent_id, recruiter_id } of recruitedAgents) {
      if (!recruiter_id) continue;

      // A recruiter who somehow refers themselves must not earn from it.
      if (recruiter_id === agent_id) {
        this.logger.warn(`Agent ${agent_id} is its own recruiter; skipping`);
        continue;
      }

      const baseKobo = await this.earningsBaseKobo(
        agent_id,
        periodStart,
        periodEnd,
      );
      if (baseKobo <= 0) continue;

      await this.creditOverride({
        beneficiaryId: recruiter_id,
        type: "agent_override",
        amountKobo: percentOfKobo(baseKobo, rate * 100),
        period,
        sourceAgentId: agent_id,
      });
    }
  }

  private async payStateManagerOverrides(
    period: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const rate = await this.settings.getStateManagerOverrideRate();

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

      const stateAgents = await this.db
        .select({ user_id: schema.agent_profiles.user_id })
        .from(schema.agent_profiles)
        .where(
          and(
            eq(schema.agent_profiles.state, managed_state),
            eq(schema.agent_profiles.status, "approved"),
          ),
        );

      /*
       * One row per manager per period, not one per agent under them. The
       * unique index is on (agent_id, type, period), so inserting per source
       * agent would collide after the first. Summing the state first also
       * matches what the override actually is: a share of the state, not a
       * pile of separate shares.
       */
      let stateBaseKobo = 0;

      for (const { user_id } of stateAgents) {
        if (user_id === manager_id) continue;
        stateBaseKobo += await this.earningsBaseKobo(
          user_id,
          periodStart,
          periodEnd,
        );
      }

      if (stateBaseKobo <= 0) continue;

      await this.creditOverride({
        beneficiaryId: manager_id,
        type: "state_manager_override",
        amountKobo: percentOfKobo(stateBaseKobo, rate * 100),
        period,
      });
    }
  }

  // === Helpers

  /*
   * The confirmed earnings an override is calculated from, in kobo. Restricted
   * to OVERRIDE_BASE_TYPES so overrides never compound on overrides.
   */
  private async earningsBaseKobo(
    agentId: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const [row] = await this.db
      .select({ total: sum(schema.commissions.amount_kobo) })
      .from(schema.commissions)
      .where(
        and(
          eq(schema.commissions.agent_id, agentId),
          eq(schema.commissions.status, "confirmed"),
          inArray(schema.commissions.type, [...OVERRIDE_BASE_TYPES]),
          gte(schema.commissions.created_at, periodStart),
          lt(schema.commissions.created_at, periodEnd),
        ),
      );

    return Number(row?.total ?? 0);
  }

  /*
   * Insert the commission row first and credit only if the insert took. The
   * partial unique index on (agent_id, type, period) means a repeat run finds
   * the row already there, inserts nothing, and therefore credits nothing. That
   * is the whole idempotency guarantee: the database refuses the second payment
   * rather than the code remembering not to make it.
   */
  private async creditOverride(args: {
    beneficiaryId: number;
    type: "agent_override" | "state_manager_override";
    amountKobo: number;
    period: string;
    sourceAgentId?: number;
  }): Promise<void> {
    const { beneficiaryId, type, amountKobo, period, sourceAgentId } = args;

    if (amountKobo <= 0) return;

    const inserted = await this.db
      .insert(schema.commissions)
      .values({
        agent_id: beneficiaryId,
        type,
        amount_kobo: amountKobo,
        status: "confirmed",
        period,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      this.logger.log(
        `${type} for agent ${beneficiaryId} already exists for ${period}; not paying again`,
      );
      return;
    }

    await this.walletService.credit(
      beneficiaryId,
      amountKobo,
      { pending: false },
      this.db,
      { reference: `commission:${inserted[0].id}`, description: type },
    );

    this.logger.log(
      `${type}: ${amountKobo} kobo credited to agent ${beneficiaryId} for ${period}` +
        (sourceAgentId ? ` from agent ${sourceAgentId}` : ""),
    );
  }

  // === Reversal

  /*
   * Claws back the "direct" commission tied to a refunded order. Only "direct"
   * commissions carry an order_id - buyer_referral has no order_id column
   * value set today, and the override types are monthly aggregates with no
   * single order to point at - so this is the entire reversible surface for a
   * refund. A commission still "pending" (order delivered, not yet paid to
   * the agent) is pulled back from pending_balance; one already "paid" is
   * pulled back from available_balance, which AgentWalletService.reverseCredit
   * deliberately does not clamp at zero, so an agent who already withdrew it
   * carries the shortfall against future earnings rather than the company
   * silently absorbing it.
   */
  async reverseCommissionsForOrder(
    orderId: number,
    reason: string,
  ): Promise<void> {
    const reversible = await this.db
      .select()
      .from(schema.commissions)
      .where(
        and(
          eq(schema.commissions.order_id, orderId),
          eq(schema.commissions.type, "direct"),
          inArray(schema.commissions.status, ["pending", "paid"]),
        ),
      );

    for (const commission of reversible) {
      await this.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(schema.commissions)
          .set({
            status: "reversed",
            reversed_at: new Date(),
            reversed_reason: reason,
          })
          .where(
            and(
              eq(schema.commissions.id, commission.id),
              inArray(schema.commissions.status, ["pending", "paid"]),
            ),
          )
          .returning();

        if (!updated) return;

        await this.walletService.reverseCredit(
          updated.agent_id,
          updated.amount_kobo,
          { fromPending: commission.status === "pending" },
          tx,
          {
            reference: `commission_reversal:${updated.id}`,
            description: reason,
          },
        );

        this.logger.log(
          `Commission ${updated.id} reversed for agent ${updated.agent_id}: ${updated.amount_kobo} kobo (${reason})`,
        );
      });
    }
  }

  /* YYYY-MM-01, the first day of the month an override is calculated for. */
  private toPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }
}
