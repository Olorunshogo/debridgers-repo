import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  BadRequestException,
  Headers,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { WalletService } from "./wallet.service";
import { EmailService } from "../../../notification/features/email/email.service";
import { PaymentService } from "./payment.service";
import { OrderService } from "./order.service";

@Controller("webhook")
export class PaystackWebhookController {
  constructor(
    private readonly walletService: WalletService,
    private readonly emailService: EmailService,
    private readonly paymentService: PaymentService,
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
        const isOrder = data.reference.startsWith("paystack_order_");

        if (isOrder) {
          // Extract order ID from reference: paystack_order_${orderId}_${timestamp}
          const orderIdMatch = data.reference.match(/paystack_order_(\d+)_/);
          if (orderIdMatch) {
            const orderId = parseInt(orderIdMatch[1], 10);

            // Update order status directly
            await this.orderService.updatePaymentStatus(orderId, "paid");
            await this.orderService.updateOrderStatus(orderId, "confirmed");

            console.error(
              `✓ Order #${orderId} payment confirmed via Paystack webhook`,
            );
          }
          return { statusCode: 200, message: "Order payment confirmed" };
        } else {
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
