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

        // Try to find payment record (for order payments)
        const [payment] = await this.db
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.paystack_reference, data.reference))
          .limit(1);

        if (payment) {
          console.error(
            `✅ PAYMENT FOUND: id=${payment.id}, order_id=${payment.order_id}`,
          );

          // Update order status
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

          // Store Paystack reference on order for audit trail
          await this.db
            .update(schema.orders)
            .set({ payment_reference: data.reference })
            .where(eq(schema.orders.id, payment.order_id));

          console.error(
            `✓ Order #${payment.order_id} payment confirmed and marked "confirmed"`,
          );

          return { statusCode: 200, message: "Order payment confirmed" };
        }

        // No payment record found - check if this is a wallet deposit (non-order)
        console.error(
          `⚠ No payment record for reference: ${data.reference} - checking if wallet deposit...`,
        );

        // Wallet deposits don't have corresponding payment records
        // Try to confirm as wallet transaction
        try {
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

          console.error(`✓ Wallet deposit confirmed for ${data.reference}`);
          return { statusCode: 200, message: "Deposit confirmed" };
        } catch (depositErr) {
          console.error(
            `⚠ Not a valid order payment or wallet deposit: ${data.reference}`,
          );
          return { statusCode: 200, message: "Webhook processed" };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Webhook processing error for ${data.reference}: ${msg}`);
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
