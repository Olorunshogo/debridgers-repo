import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  BadRequestException,
  Headers,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { WalletService } from "./wallet.service";
import { EmailService } from "../../../notification/features/email/email.service";
import { OrderService } from "./order.service";

@Controller("webhook")
export class PaystackWebhookController {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly walletService: WalletService,
    private readonly emailService: EmailService,
    private readonly orderService: OrderService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhookPost(
    @Body() event: unknown,
    @Headers("x-paystack-signature") signature: string,
  ) {
    return this.handleWebhook(event, signature, "charge");
  }

  private async handleWebhook(
    event: unknown,
    signature: string,
    _type: "deposit" | "charge",
  ) {
    const paystackSecret = this.config.get<string>("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      throw new BadRequestException("Paystack secret not configured");
    }

    if (!signature) {
      throw new BadRequestException("No signature provided");
    }

    const verified = this.verifyPaystackSignature(
      event,
      signature,
      paystackSecret,
    );
    if (!verified) {
      throw new HttpException(
        { statusCode: 401, message: "Invalid signature" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const typedEvent = event as { event?: string; data?: unknown };
    if (typedEvent.event === "charge.success") {
      const data = typedEvent.data as {
        reference?: string;
        amount?: number;
        customer?: { email?: string; first_name?: string };
        metadata?: { user_id?: number };
      };

      if (!data.reference) {
        throw new BadRequestException("No reference in webhook data");
      }

      try {
        console.error(`📍 WEBHOOK PAYSTACK_REFERENCE: ${data.reference}`);

        // Find payment record by paystack_reference
        const [payment] = await this.db
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.paystack_reference, data.reference))
          .limit(1);

        if (payment) {
          console.error(
            `📍 FOUND PAYMENT_ID: ${payment.id}, ORDER_ID: ${payment.order_id}`,
          );

          // Update order status using order_id from payment record
          await this.orderService.updatePaymentStatus(payment.order_id, "paid");
          await this.orderService.updateOrderStatus(
            payment.order_id,
            "confirmed",
          );

          // Update payment record
          await this.db
            .update(schema.payments)
            .set({ status: "completed", paid_at: new Date() })
            .where(eq(schema.payments.id, payment.id));

          console.error(
            `✓ Order #${payment.order_id} payment confirmed via payment_id #${payment.id}`,
          );

          return { statusCode: 200, message: "Order payment confirmed" };
        }

        // Fallback: if payment record not found but it's an order payment,
        // extract orderId from reference and update order
        // This handles race conditions where webhook arrives before payment record is inserted
        const isOrder = data.reference.startsWith("paystack_order_");
        if (isOrder) {
          console.error(
            `⚠ Payment record not found for reference: ${data.reference}, attempting fallback via reference parsing`,
          );

          // Extract order ID from reference: paystack_order_${orderId}_${timestamp}
          const orderIdMatch = data.reference.match(/paystack_order_(\d+)_/);
          if (orderIdMatch) {
            const orderId = parseInt(orderIdMatch[1], 10);

            // Verify order exists and hasn't been updated yet
            const [order] = await this.db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.id, orderId))
              .limit(1);

            if (order && order.payment_status !== "paid") {
              // Update order status via fallback
              await this.orderService.updatePaymentStatus(orderId, "paid");
              await this.orderService.updateOrderStatus(orderId, "confirmed");

              // Update order's payment reference
              await this.db
                .update(schema.orders)
                .set({ payment_reference: data.reference })
                .where(eq(schema.orders.id, orderId));

              console.error(
                `✓ Order #${orderId} payment confirmed via fallback (payment record not yet available)`,
              );

              return { statusCode: 200, message: "Order payment confirmed" };
            }
          }

          console.error(
            `✗ Could not process order payment for reference: ${data.reference}`,
          );
          return { statusCode: 200, message: "Webhook processed" };
        }

        // Handle wallet deposits (non-order payments)
        if (!isOrder) {
          await this.walletService.confirmTransaction(data.reference);

          const email = data.customer?.email || "buyer@example.com";
          const name = data.customer?.first_name || "Buyer";
          const amount = data.amount
            ? `₦${Math.round(data.amount / 100)}`
            : "₦0";

          this.emailService
            .sendDepositConfirmation(email, name, amount, data.reference)
            .catch((err) => {
              console.error("Failed to send deposit confirmation email:", err);
            });

          return { statusCode: 200, message: "Deposit confirmed" };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Webhook error for reference ${data.reference}: ${msg}`);
        return { statusCode: 200, message: "Webhook processed" };
      }
    }

    return { statusCode: 200, message: "Event processed" };
  }

  private verifyPaystackSignature(
    body: unknown,
    signature: string,
    secret: string,
  ): boolean {
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    return hash === signature;
  }
}
