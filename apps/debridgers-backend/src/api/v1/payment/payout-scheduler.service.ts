import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, gte, sum } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import {
  AgentPayoutTargetService,
  AgentPayoutTargetError,
} from "./agent-payout-target.service";
import { NotificationsService } from "../buyer/notifications.service";
import { toPaystackAmount, formatNaira } from "../../shared/money";

@Injectable()
export class PayoutSchedulerService {
  private readonly logger = new Logger(PayoutSchedulerService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";
  private readonly minPayoutAmount: number;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
    private readonly payoutTargets: AgentPayoutTargetService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
    this.minPayoutAmount = parseInt(
      this.config.get<string>("MIN_PAYOUT_AMOUNT") ?? "50000",
      10,
    );
  }

  @Cron("0 10 * * 5", {
    name: "agent-payouts",
    timeZone: "UTC",
  })
  async processWeeklyPayouts() {
    this.logger.log("Starting weekly payout cycle");

    try {
      const agents = await this.db
        .select({ agent_id: schema.agent_profiles.user_id })
        .from(schema.agent_profiles)
        .where(eq(schema.agent_profiles.status, "approved"));

      for (const { agent_id } of agents) {
        await this.processAgentPayout(agent_id);
      }

      this.logger.log("Weekly payout cycle completed");
    } catch (error) {
      this.logger.error("Weekly payout cycle failed", error);
    }
  }

  private async processAgentPayout(agentId: number) {
    try {
      const [agent] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, agentId))
        .limit(1);

      if (!agent) {
        this.logger.warn(`Agent ${agentId} not found`);
        return;
      }

      const totalCommission = await this.getTotalCommission(agentId);
      if (totalCommission < this.minPayoutAmount) {
        this.logger.log(
          `Agent ${agentId} commission ${formatNaira(totalCommission)} below minimum`,
        );
        return;
      }

      /*
       * A payout that cannot be sent has to be visible. This used to be a
       * logger.warn and nothing else, so an agent with no bank details was
       * skipped every Friday in silence.
       */
      let target;
      try {
        target = await this.payoutTargets.resolve(agentId);
      } catch (error) {
        if (error instanceof AgentPayoutTargetError) {
          this.logger.warn(`Agent ${agentId} payout skipped: ${error.message}`);
          await this.notificationsService.notifyAdmins({
            type: "withdrawal",
            title: "Agent payout skipped",
            description: `${agent.email} is owed ${formatNaira(totalCommission)} but could not be paid: ${error.reason.replace(/_/g, " ")}.`,
          });
          return;
        }
        throw error;
      }

      const reference = `PAYOUT_${agentId}_${Date.now()}`;

      const transferResponse = await fetch(`${this.baseUrl}/transfer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          /*
           * Kobo. This divided by 100 first, paying one hundredth of what was owed.
           * It also addressed a subaccount that /transfer rejects.
           */
          amount: toPaystackAmount(totalCommission),
          recipient: target.recipientCode,
          reference,
          reason: `Weekly agent commission - ${agent.email}`,
        }),
      });

      const data = (await transferResponse.json()) as {
        status: boolean;
        data?: { transfer_code: string; status: string };
        message?: string;
      };

      if (!data.status) {
        await this.createPayoutRecord(
          agentId,
          totalCommission,
          reference,
          "failed",
          data.message,
        );
        this.logger.error(
          `Transfer failed for agent ${agentId}: ${data.message}`,
        );
        return;
      }

      await this.createPayoutRecord(
        agentId,
        totalCommission,
        reference,
        "processing",
        null,
      );

      this.logger.log(
        `Payout initiated for agent ${agentId}: ₦${Math.floor(totalCommission / 100)}`,
      );
    } catch (error) {
      this.logger.error(`Error processing payout for agent ${agentId}`, error);
    }
  }

  private async getTotalCommission(agentId: number): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [result] = await this.db
      .select({
        total: sum(schema.commissions.amount_kobo).mapWith((val) => val ?? "0"),
      })
      .from(schema.commissions)
      .where(
        and(
          eq(schema.commissions.agent_id, agentId),
          eq(schema.commissions.status, "paid"),
          gte(schema.commissions.paid_at, oneWeekAgo),
          eq(schema.commissions.type, "direct"),
        ),
      );

    // Convert to kobo.
    return Math.round(parseFloat(result?.total ?? "0") * 100);
  }

  private async createPayoutRecord(
    agentId: number,
    amountKobo: number,
    reference: string,
    status: "pending" | "processing" | "completed" | "failed",
    errorMessage: string | null | undefined,
  ) {
    const [profile] = await this.db
      .select({
        subaccount_code: schema.agent_profiles.paystack_subaccount_code,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    // amount is stored in naira, converted from the kobo amount taken in.
    await this.db.insert(schema.payouts).values({
      agent_id: agentId,
      subaccount_code: profile?.subaccount_code ?? null,
      amount: String(amountKobo / 100),
      reference,
      status,
      error_message: errorMessage ?? null,
    });
  }
}
