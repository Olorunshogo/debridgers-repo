import { Injectable, Logger, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { PaystackBankService } from "./paystack-bank.service";

/*
 * Resolves where an agent's money is sent.
 *
 * Both agent payout paths - the Friday sweep and the on-demand withdrawal -
 * independently read agent_profiles and independently passed
 * paystack_subaccount_code as the transfer `recipient`. A subaccount is a
 * split destination for incoming payments; POST /transfer needs a transfer
 * recipient (RCP_...). Two copies of the same wrong lookup is how the mistake
 * survived in both places, so the lookup now lives once, here.
 *
 * The recipient is created lazily rather than at registration: an agent's bank
 * details arrive later than their account, and creating it on first payout
 * means agents onboarded before this existed are repaired automatically.
 */

export interface AgentPayoutTarget {
  recipientCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export type AgentPayoutTargetFailure =
  | "agent_not_found"
  | "missing_bank_details"
  | "recipient_creation_failed";

export class AgentPayoutTargetError extends Error {
  constructor(
    readonly reason: AgentPayoutTargetFailure,
    message: string,
  ) {
    super(message);
    this.name = "AgentPayoutTargetError";
  }
}

@Injectable()
export class AgentPayoutTargetService {
  private readonly logger = new Logger(AgentPayoutTargetService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly paystackBankService: PaystackBankService,
  ) {}

  /**
   * The agent's transfer recipient, creating it from their stored bank details on first use.
   * Throws AgentPayoutTargetError so callers can tell "this agent has not given us bank details yet" apart from "Paystack refused".
   */
  async resolve(agentUserId: number): Promise<AgentPayoutTarget> {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentUserId))
      .limit(1);

    if (!profile) {
      throw new AgentPayoutTargetError(
        "agent_not_found",
        `No agent profile for user ${agentUserId}`,
      );
    }

    if (!profile.bank_account_number || !profile.bank_code) {
      throw new AgentPayoutTargetError(
        "missing_bank_details",
        `Agent ${agentUserId} has no bank account on file`,
      );
    }

    const accountName =
      profile.bank_account_name ?? profile.bank_account_number;

    if (profile.paystack_recipient_code) {
      return {
        recipientCode: profile.paystack_recipient_code,
        bankAccountNumber: profile.bank_account_number,
        bankAccountName: accountName,
      };
    }

    let recipientCode: string;
    try {
      recipientCode = await this.paystackBankService.createRecipient(
        profile.bank_account_number,
        profile.bank_code,
        accountName,
      );
    } catch (error) {
      throw new AgentPayoutTargetError(
        "recipient_creation_failed",
        `Could not create a transfer recipient for agent ${agentUserId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await this.db
      .update(schema.agent_profiles)
      .set({ paystack_recipient_code: recipientCode })
      .where(eq(schema.agent_profiles.id, profile.id));

    this.logger.log(
      `Created transfer recipient ${recipientCode} for agent ${agentUserId}`,
    );

    return {
      recipientCode,
      bankAccountNumber: profile.bank_account_number,
      bankAccountName: accountName,
    };
  }

  /*
   * Invalidates the cached recipient so the next payout rebuilds it. Call this
   * when an agent changes their bank details, or the stored RCP_ code keeps
   * pointing at the old account and money goes to the wrong place.
   */
  async clear(agentUserId: number): Promise<void> {
    await this.db
      .update(schema.agent_profiles)
      .set({ paystack_recipient_code: null })
      .where(eq(schema.agent_profiles.user_id, agentUserId));
  }
}
