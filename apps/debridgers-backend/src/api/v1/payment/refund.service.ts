import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

export interface InitiateRefundDto {
  order_id: number;
  reason: string;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
  }

  async initiateRefund(
    dto: InitiateRefundDto,
    adminId: number,
  ): Promise<{ message: string; data: { refund_id: number; status: string } }> {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, dto.order_id))
      .limit(1);

    if (!order) throw new NotFoundException("Order not found");

    if (order.payment_status !== "paid") {
      throw new BadRequestException("Only paid orders can be refunded");
    }

    if (!order.payment_reference) {
      throw new BadRequestException("Order has no payment reference");
    }

    const amountKobo = order.total_amount as unknown as number;
    const amountNaira = Math.round(amountKobo / 100);
    const reference = `REFUND_${dto.order_id}_${Date.now()}`;

    const refundResponse = await fetch(`${this.baseUrl}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: order.payment_reference,
        amount: amountNaira,
        reason: dto.reason,
        reference,
      }),
    });

    const data = (await refundResponse.json()) as {
      status: boolean;
      data?: { refund: { id: number; status: string } };
      message?: string;
    };

    if (!data.status) {
      this.logger.error(
        `Refund API call failed for order ${dto.order_id}: ${data.message}`,
      );
      throw new BadRequestException(
        `Refund failed: ${data.message ?? "Unknown error"}`,
      );
    }

    const [refund] = await this.db
      .insert(schema.refunds)
      .values({
        order_id: dto.order_id,
        amount: String(amountNaira),
        reference,
        reason: dto.reason,
        status: "processing",
        initiated_by: adminId,
      })
      .returning();

    this.logger.log(
      `Refund initiated for order ${dto.order_id}: ₦${amountNaira}`,
    );

    return {
      message: "Refund initiated",
      data: {
        refund_id: refund.id,
        status: "processing",
      },
    };
  }

  async handleRefundWebhook(payload: Record<string, unknown>) {
    const data = payload.data as Record<string, unknown>;
    const reference = data.reference as string;

    if (!reference?.startsWith("REFUND_")) {
      return;
    }

    const [refund] = await this.db
      .select()
      .from(schema.refunds)
      .where(eq(schema.refunds.reference, reference))
      .limit(1);

    if (!refund) {
      this.logger.warn(`Refund not found for reference ${reference}`);
      return;
    }

    const refundStatus = (data.status as string)?.toLowerCase();
    let status: "processing" | "completed" | "failed" = "processing";

    if (refundStatus === "completed" || refundStatus === "success") {
      status = "completed";
    } else if (refundStatus === "failed") {
      status = "failed";
    }

    await this.db
      .update(schema.refunds)
      .set({
        status,
        completed_at: status === "completed" ? new Date() : undefined,
      })
      .where(eq(schema.refunds.id, refund.id));

    this.logger.log(`Refund ${refund.id} status updated to ${status}`);
  }
}
