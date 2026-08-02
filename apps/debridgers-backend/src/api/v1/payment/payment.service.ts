import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { WebhookDeduplicationService } from "../../../infrastructure/webhook/webhook-deduplication.service";
import { InitializePaymentDto } from "./dto/initialize-payment.dto";
import { CreateVirtualAccountDto } from "./dto/create-virtual-account.dto";
import { SafeHavenService } from "./safehaven.service";
import { SystemSettingsService } from "../settings/system-settings.service";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
    private readonly safehaven: SafeHavenService,
    private readonly settings: SystemSettingsService,
    private readonly webhookDedup: WebhookDeduplicationService,
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

  async handleWebhook(payload: Record<string, unknown>, signature: string) {
    const crypto = await import("crypto");
    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (hash !== signature) {
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
    }

    return { message: "Webhook processed", data: null };
  }

  // ─── SafeHaven: virtual account for order payment ──────────────────────────

  async createVirtualAccountForOrder(
    dto: CreateVirtualAccountDto,
    buyerId: number,
  ) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, dto.order_id))
      .limit(1);

    if (!order) throw new NotFoundException("Order not found");
    if (order.buyer_id !== buyerId) {
      throw new UnauthorizedException("This is not your order");
    }
    if (order.payment_status === "paid") {
      throw new BadRequestException("Order is already paid");
    }

    const reference = `ORD-${dto.order_id}-${Date.now()}`;

    const virtual = await this.safehaven.createVirtualAccount({
      amountKobo: dto.amount,
      validForSeconds: dto.valid_for_seconds,
      externalReference: reference,
    });

    await this.db
      .update(schema.orders)
      .set({
        payment_status: "awaiting",
        payment_reference: reference,
        virtual_account_number: virtual.accountNumber,
        virtual_account_bank: virtual.bankName,
        virtual_account_account_name: virtual.accountName,
        virtual_account_expires_at: virtual.expiresAt,
      })
      .where(eq(schema.orders.id, dto.order_id));

    return {
      message: "Virtual account created — transfer to complete payment",
      data: {
        accountNumber: virtual.accountNumber,
        accountName: virtual.accountName,
        bankName: virtual.bankName,
        amount: dto.amount / 100, // back to naira for display
        expiresAt: virtual.expiresAt,
        reference,
      },
    };
  }

  // ─── SafeHaven webhook ─────────────────────────────────────────────────────

  async handleSafehavenWebhook(
    payload: Record<string, unknown>,
    rawBody: string,
    signature: string,
  ) {
    if (!this.safehaven.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException("Invalid SafeHaven webhook signature");
    }

    const eventType = (payload.type ?? payload.event) as string | undefined;
    const data = payload.data as Record<string, unknown> | undefined;

    if (!data) return { message: "Webhook acknowledged", data: null };

    if (
      eventType === "virtualAccount.transfer" ||
      eventType === "virtual_account.credit"
    ) {
      const externalRef = data.externalReference as string | undefined;
      if (externalRef) {
        const [order] = await this.db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.payment_reference, externalRef))
          .limit(1);

        if (order && order.payment_status !== "paid") {
          await this.db
            .update(schema.orders)
            .set({ payment_status: "paid", paid_at: new Date() })
            .where(eq(schema.orders.id, order.id));

          this.logger.log(
            `Order #${order.id} marked paid via SafeHaven ref ${externalRef}`,
          );
        }
      }
    }

    return { message: "Webhook processed", data: null };
  }

  // ─── SafeHaven: process agent withdrawal payout ────────────────────────────

  /*
   * `adminId` is null when the weekly cron is the caller rather than a person.
   * `processed_by` is nullable precisely so an automated payout can be recorded
   * without inventing a fake admin.
   */
  async processWithdrawal(withdrawalId: number, adminId: number | null) {
    const [withdrawal] = await this.db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    if (withdrawal.status !== "approved") {
      throw new BadRequestException(
        "Withdrawal must be approved before processing",
      );
    }

    /*
     * Claim the row before touching SafeHaven.
     *
     * The check above is not enough on its own: an admin clicking payout while
     * the Friday cron is mid-sweep would have both callers read "approved" and
     * both send a transfer. Stamping `processed_at` under a WHERE that still
     * requires it to be null means exactly one caller can win, and the loser
     * gets zero updated rows.
     */
    const claimed = await this.db
      .update(schema.withdrawals)
      .set({ processed_at: new Date(), processed_by: adminId })
      .where(
        and(
          eq(schema.withdrawals.id, withdrawalId),
          eq(schema.withdrawals.status, "approved"),
          isNull(schema.withdrawals.processed_at),
        ),
      )
      .returning({ id: schema.withdrawals.id });

    if (claimed.length === 0) {
      throw new BadRequestException(
        "This payout is already being processed or has been paid.",
      );
    }

    const amountNaira = withdrawal.amount / 100;

    try {
      // Verify the bank account before transferring
      const enquiry = await this.safehaven.nameEnquiry(
        withdrawal.bank_code,
        withdrawal.bank_account_number,
      );

      /*
       * Deterministic reference: a retry of the same withdrawal reuses it, so
       * SafeHaven can reject the duplicate instead of paying twice.
       */
      const reference = `PAYOUT-${withdrawalId}`;

      const result = await this.safehaven.transfer({
        nameEnquirySessionId: enquiry.sessionId,
        beneficiaryBankCode: withdrawal.bank_code,
        beneficiaryAccountNumber: withdrawal.bank_account_number,
        amount: amountNaira,
        narration: `Debridgers commission payout for agent #${withdrawal.agent_id}`,
        paymentReference: reference,
      });

      await this.db
        .update(schema.withdrawals)
        .set({ status: "paid", payout_reference: result.reference })
        .where(eq(schema.withdrawals.id, withdrawalId));

      this.logger.log(
        `Payout ₦${amountNaira} to agent #${withdrawal.agent_id} — ref ${result.reference}`,
      );

      return {
        message: "Payout processed",
        data: { reference: result.reference, status: result.status },
      };
    } catch (error) {
      /*
       * Release the claim so a later run can retry. The status was never moved
       * off "approved", so this returns the row to exactly its prior state.
       */
      await this.db
        .update(schema.withdrawals)
        .set({ processed_at: null, processed_by: null })
        .where(eq(schema.withdrawals.id, withdrawalId));

      this.logger.error(
        `Payout failed for withdrawal #${withdrawalId}; claim released for retry`,
      );
      throw error;
    }
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
