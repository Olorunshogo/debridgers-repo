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
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { InitializePaymentDto } from "./dto/initialize-payment.dto";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly secretKey: string;
  private readonly commissionRate: number;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
    this.commissionRate =
      this.config.get<number>("PaystackConfig.commissionRate") ?? 0.3;
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
    const split = agentProfile.paystack_subaccount_code
      ? {
          split: {
            type: "percentage",
            bearer_type: "all",
            subaccounts: [
              {
                subaccount: agentProfile.paystack_subaccount_code,
                share: Math.round(this.commissionRate * 100),
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

  async handleWebhook(payload: Record<string, unknown>, signature: string) {
    const crypto = await import("crypto");
    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (hash !== signature) {
      throw new BadRequestException("Invalid webhook signature");
    }

    if (payload.event === "charge.success") {
      const data = payload.data as Record<string, unknown>;
      const metadata = data.metadata as Record<string, unknown>;
      const agentId = metadata?.agent_id as number;
      const amount = (data.amount as number) / 100;

      if (agentId) {
        const commissionAmount = amount * this.commissionRate;

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

  async createSubaccount(agentId: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, agentId))
      .limit(1);

    if (!user) throw new NotFoundException("Agent not found");

    const response = await fetch(`${this.baseUrl}/subaccount`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: `${user.first_name} ${user.last_name}`,
        settlement_bank: "058",
        account_number: "0000000000",
        percentage_charge: this.commissionRate * 100,
        description: `Debridgers agent — ${user.email}`,
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
