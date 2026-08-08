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

@Controller("webhook/paystack")
export class PaystackWebhookController {
  constructor(
    private readonly walletService: WalletService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Post("deposit")
  @HttpCode(HttpStatus.OK)
  async handleDepositWebhook(
    @Body() event: unknown,
    @Headers("x-paystack-signature") signature: string,
  ) {
    const paystackSecret = this.config.get<string>("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      throw new BadRequestException("Paystack secret not configured");
    }

    // Verify Paystack signature
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

    // Handle charge.success event
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
        // Confirm the transaction
        await this.walletService.confirmTransaction(data.reference);

        // Send deposit confirmation email (fire-and-forget)
        const email = data.customer?.email || "buyer@example.com";
        const name = data.customer?.first_name || "Buyer";
        const amount = data.amount ? `₦${Math.round(data.amount / 100)}` : "₦0";

        this.emailService
          .sendDepositConfirmation(email, name, amount, data.reference)
          .catch((err) => {
            console.error("Failed to send deposit confirmation email:", err);
          });

        return { statusCode: 200, message: "Deposit confirmed" };
      } catch (err) {
        console.error("Error confirming deposit:", err);
        // Still return 200 to Paystack to prevent retries
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
