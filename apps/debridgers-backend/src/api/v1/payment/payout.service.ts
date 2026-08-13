import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { PaymentService } from "./payment.service";

/*
 * The weekly payout sweep the agent wallet page has always advertised
 * ("Automatic payout at ... Every Friday 9am disbursement") but which nothing
 * actually performed. Until this existed, an approved withdrawal sat in the
 * table until an admin remembered to POST /payment/payout/:id by hand.
 *
 * Scope is deliberately narrow: it pays withdrawals an admin has already
 * approved. It does not approve anything itself, because approval is the human
 * review step and automating it would remove the only check on the queue.
 */

/* Friday 09:00. Nigeria has no DST, so this is stable year-round. */
const FRIDAY_9AM = "0 9 * * 5";
const NIGERIA_TZ = "Africa/Lagos";

export interface PayoutRunResult {
  attempted: number;
  paid: number;
  failed: { withdrawal_id: number; reason: string }[];
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  /*
   * Guards against a slow sweep still running when the next trigger fires, and
   * against a manual run overlapping the scheduled one. The per-row claim in
   * `processWithdrawal` is the real correctness guarantee; this just avoids
   * pointless duplicate work and confusing logs.
   */
  private running = false;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly payment: PaymentService,
  ) {}

  @Cron(FRIDAY_9AM, { name: "weekly-agent-payouts", timeZone: NIGERIA_TZ })
  async runWeeklyPayouts(): Promise<PayoutRunResult> {
    if (this.running) {
      this.logger.warn("Payout sweep already in progress; skipping this run");
      return { attempted: 0, paid: 0, failed: [] };
    }

    this.running = true;
    this.logger.log("Weekly agent payout sweep starting");

    try {
      return await this.sweep();
    } finally {
      this.running = false;
    }
  }

  private async sweep(): Promise<PayoutRunResult> {
    /*
     * `processed_at IS NULL` matters as well as the status: a row mid-claim by
     * another caller is skipped rather than fought over.
     */
    const due = await this.db
      .select({
        id: schema.withdrawals.id,
        agent_id: schema.withdrawals.agent_id,
        amount: schema.withdrawals.amount,
      })
      .from(schema.withdrawals)
      .where(
        and(
          eq(schema.withdrawals.status, "approved"),
          isNull(schema.withdrawals.processed_at),
        ),
      );

    const result: PayoutRunResult = {
      attempted: due.length,
      paid: 0,
      failed: [],
    };

    /*
     * Sequential on purpose. These are real bank transfers against one debit
     * account; running them in parallel makes a partial failure much harder to
     * reason about, and the weekly volume does not justify the risk.
     */
    for (const row of due) {
      try {
        /* No admin behind an automated run, hence null. */
        await this.payment.processWithdrawal(row.id, null);
        result.paid += 1;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Unknown payout failure";
        result.failed.push({ withdrawal_id: row.id, reason });
        /*
         * One agent's bad account details must not strand everyone behind them
         * in the queue, so the loop continues.
         */
        this.logger.error(
          `Payout failed for withdrawal #${row.id} (agent ${row.agent_id}): ${reason}`,
        );
      }
    }

    this.logger.log(
      `Weekly payout sweep done: ${result.paid}/${result.attempted} paid, ${result.failed.length} failed`,
    );

    return result;
  }
}
