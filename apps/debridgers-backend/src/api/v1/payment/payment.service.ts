import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { WebhookDeduplicationService } from "../../../infrastructure/webhook/webhook-deduplication.service";
import { InitializePaymentDto } from "./dto/initialize-payment.dto";
import { SystemSettingsService } from "../settings/system-settings.service";
import { RefundService } from "./refund.service";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
    private readonly settings: SystemSettingsService,
    private readonly webhookDedup: WebhookDeduplicationService,
    private readonly refundService: RefundService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
  }

  async initialize(dto: InitializePaymentDto) {
    const [agentProfile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, dto.agent_id))
      .limit(1);

    if (!agentProfile) throw new NotFoundException("Agent not found");
    if (agentProfile.status !== "approved") {
      throw new BadRequestException("Agent is not approved");
    }

    const amountKobo = Math.round(dto.amount * 100);
    const commissionPercent = await this.settings.getAgentCommissionPercent();
    const split = agentProfile.paystack_subaccount_code
      ? {
          split: {
            type: "percentage",
            bearer_type: "all",
            subaccounts: [
              {
                subaccount: agentProfile.paystack_subaccount_code,
                share: Math.round(commissionPercent),
              },
            ],
          },
        }
      : {};

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: dto.email,
        amount: amountKobo,
        metadata: { agent_id: dto.agent_id, ...dto.metadata },
        ...split,
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      data: { authorization_url: string; reference: string };
    };
    if (!data.status)
      throw new BadRequestException("Payment initialization failed");

    return { message: "Payment initialized", data: data.data };
  }

  /*
   * Buyer checkout initialize. Separate from `initialize`, which is the agent
   * stock flow and carries a subaccount split - a buyer order has no agent to
   * split with. metadata.type is what lets the shared webhook tell them apart.
   */
  async initializeBuyerOrder(params: {
    email: string;
    amountKobo: number;
    orderId: number;
    buyerId: number;
  }) {
    const callbackUrl = `${this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000"}/buyer-dashboard/checkout`;

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        callback_url: callbackUrl,
        metadata: {
          type: "buyer_order",
          order_id: params.orderId,
          buyer_id: params.buyerId,
        },
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data: { authorization_url: string; reference: string };
    };

    if (!data.status) {
      throw new BadRequestException(
        data.message ?? "Payment initialization failed",
      );
    }

    return data.data;
  }

  /**
   * Verify Paystack webhook signature
   */
  verifyWebhookSignature(
    payload: Record<string, unknown>,
    signature: string,
  ): boolean {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(JSON.stringify(payload))
      .digest("hex");

    return hash === signature;
  }

  async handleWebhook(payload: Record<string, unknown>, signature: string) {
    // Signature is already verified in controller, but verify again for safety
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException("Invalid webhook signature");
    }

    // SECURITY FIX: Webhook replay attack protection via deduplication
    const webhookId = this.webhookDedup.extractWebhookId(payload);
    const isNew = await this.webhookDedup.isNewWebhook(
      "paystack",
      webhookId ?? "",
    );

    if (!isNew) {
      return { message: "Webhook processed", data: null };
    }

    if (payload.event === "charge.success") {
      const data = payload.data as Record<string, unknown>;
      const metadata = data.metadata as Record<string, unknown>;
      const agentId = metadata?.agent_id as number;
      const amount = (data.amount as number) / 100;

      /*
       * Buyer checkout. The order already exists as pending/unpaid - this is
       * the confirmation. Matched on the stored reference rather than the id
       * alone so a replayed webhook cannot confirm the wrong order.
       */
      if (metadata?.type === "buyer_order") {
        const orderId = Number(metadata.order_id);
        const reference = data.reference as string;

        if (orderId) {
          await this.db
            .update(schema.orders)
            .set({
              payment_status: "paid",
              status: "confirmed",
              paid_at: new Date(),
              payment_reference: reference,
            })
            .where(eq(schema.orders.id, orderId));

          /* The cart has served its purpose once the order is paid. */
          const buyerId = Number(metadata.buyer_id);
          if (buyerId) {
            await this.db
              .delete(schema.cart_items)
              .where(eq(schema.cart_items.user_id, buyerId));
          }

          this.logger.log(`Buyer order ${orderId} marked paid`);
        }

        return { message: "Webhook processed", data: null };
      }

      if (agentId) {
        const commissionRate = await this.settings.getAgentCommissionRate();
        const commissionAmount = amount * commissionRate;

        await this.db.insert(schema.commissions).values({
          agent_id: agentId,
          type: "direct",
          amount: String(commissionAmount),
          status: "paid",
          paid_at: new Date(),
        });
        this.logger.log(
          `Commission ₦${commissionAmount} recorded for agent ${agentId}`,
        );
      }
    } else if (
      payload.event === "refund.processed" ||
      payload.event === "refund.failed"
    ) {
      await this.refundService.handleRefundWebhook(
        payload.data as Record<string, unknown>,
      );
    }

    return { message: "Webhook processed", data: null };
  }

  async processWithdrawal(withdrawalId: number, adminId: number | null) {
    const [withdrawal] = await this.db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) throw new NotFoundException("Withdrawal not found");

    const [agent] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, withdrawal.agent_id))
      .limit(1);

    if (!agent) throw new NotFoundException("Agent not found");

    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, withdrawal.agent_id))
      .limit(1);

    if (!profile?.bank_account_number || !profile?.bank_code) {
      throw new BadRequestException(
        "Agent has incomplete bank details on file",
      );
    }

    if (!profile.paystack_subaccount_code) {
      throw new BadRequestException("Agent has no Paystack subaccount");
    }

    const amountNaira = Math.round(
      parseFloat(withdrawal.amount as unknown as string),
    );
    const reference = `WITHDRAWAL_${withdrawalId}_${Date.now()}`;

    const transferResponse = await fetch(`${this.baseUrl}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountNaira,
        recipient: profile.paystack_subaccount_code,
        reference,
        reason: `On-demand withdrawal - ${agent.email}`,
      }),
    });

    const data = (await transferResponse.json()) as {
      status: boolean;
      message?: string;
    };

    if (!data.status) {
      await this.db
        .update(schema.withdrawals)
        .set({
          status: "rejected",
          rejection_reason: data.message ?? "Transfer API error",
          processed_at: new Date(),
          processed_by: adminId,
        })
        .where(eq(schema.withdrawals.id, withdrawalId));

      throw new BadRequestException(
        `Transfer failed: ${data.message ?? "Unknown error"}`,
      );
    }

    await this.db
      .update(schema.withdrawals)
      .set({
        status: "paid",
        payout_reference: reference,
        processed_at: new Date(),
        processed_by: adminId,
      })
      .where(eq(schema.withdrawals.id, withdrawalId));

    this.logger.log(
      `Withdrawal ${withdrawalId} processed for agent ${withdrawal.agent_id}: ₦${amountNaira}`,
    );

    return { message: "Withdrawal processing", data: { reference } };
  }

  async createSubaccount(agentId: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, agentId))
      .limit(1);

    if (!user) throw new NotFoundException("Agent not found");

    const [profile] = await this.db
      .select({
        bank_code: schema.agent_profiles.bank_code,
        bank_account_number: schema.agent_profiles.bank_account_number,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    /*
     * Previously hardcoded to bank 058 / account 0000000000, which created
     * subaccounts that could never settle. The agent must supply real details
     * through the bank-details endpoint first.
     */
    if (!profile?.bank_code || !profile.bank_account_number) {
      throw new BadRequestException(
        "This agent has no bank details on file. They must add them before a subaccount can be created.",
      );
    }

    const response = await fetch(`${this.baseUrl}/subaccount`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: `${user.first_name} ${user.last_name}`,
        settlement_bank: profile.bank_code,
        account_number: profile.bank_account_number,
        percentage_charge: await this.settings.getAgentCommissionPercent(),
        description: `Debridgers agent - ${user.email}`,
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      data: { subaccount_code: string };
    };
    if (!data.status)
      throw new BadRequestException("Subaccount creation failed");

    await this.db
      .update(schema.agent_profiles)
      .set({ paystack_subaccount_code: data.data.subaccount_code })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return {
      message: "Subaccount created",
      data: { subaccount_code: data.data.subaccount_code },
    };
  }
}
