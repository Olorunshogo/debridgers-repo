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
  Req,
  RawBodyRequest,
} from "@nestjs/common";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { WalletService } from "../wallet/wallet.service";
import { EmailService } from "../../../notification/features/email/email.service";
import { OrderService } from "../buyer/order.service";
import { WithdrawalService } from "./withdrawal.service";
import { LedgerService } from "./ledger.service";

@Controller("webhook")
export class PaystackWebhookController {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly walletService: WalletService,
    private readonly emailService: EmailService,
    private readonly orderService: OrderService,
    private readonly withdrawalService: WithdrawalService,
    private readonly config: ConfigService,
    private readonly ledger: LedgerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhookPost(
    @Body() event: unknown,
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature: string,
  ) {
    return this.handleWebhook(event, req.rawBody, signature, "charge");
  }

  private async handleWebhook(
    event: unknown,
    rawBody: Buffer | undefined,
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
      rawBody,
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
        channel?: string;
        customer?: {
          email?: string;
          first_name?: string;
          customer_code?: string;
        };
        metadata?: { user_id?: number };
      };

      if (!data.reference) {
        throw new BadRequestException("No reference in webhook data");
      }

      try {
        console.error(`📍 WEBHOOK PAYSTACK_REFERENCE: ${data.reference}`);

        // Look for order with matching payment_reference
        const [order] = await this.db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.payment_reference, data.reference))
          .limit(1);

        if (order) {
          console.error(
            `✅ ORDER FOUND: id=${order.id}, payment_ref=${order.payment_reference}, status=${order.payment_status}`,
          );

          // Only update if order is still unpaid
          if (order.payment_status !== "paid") {
            // Update order payment and status
            await this.orderService.updatePaymentStatus(order.id, "paid");
            await this.orderService.updateOrderStatus(order.id, "confirmed");

            console.error(
              `✅ Order #${order.id} CONFIRMED: payment_status=paid, status=confirmed`,
            );
          } else {
            console.error(
              `ℹ️ Order #${order.id} already confirmed (idempotent)`,
            );
          }

          return { statusCode: 200, message: "Order payment confirmed" };
        }

        // No order found with this reference - check if it's a wallet deposit
        console.error(
          `⚠ No order found for reference: ${data.reference} - checking if wallet deposit...`,
        );

        /*
         * A transfer into a dedicated account has no order and no pending
         * wallet transaction to confirm - the buyer initialised nothing - so
         * it reaches this point and, before this branch existed, fell through
         * to a silent success. It is credited through the same ledger call the
         * other webhook route uses, keyed on the same Paystack reference, so
         * whichever endpoint Paystack is pointed at the money lands exactly
         * once even if both receive it.
         */
        if (data.channel === "dedicated_nuban") {
          const customerCode = data.customer?.customer_code;
          const wallet = customerCode
            ? await this.ledger.getWalletByCustomerCode(customerCode)
            : undefined;

          if (!data.amount || data.amount <= 0) {
            console.error(`⚠ DVA transfer ${data.reference} carried no amount`);
            return { statusCode: 200, message: "Webhook processed" };
          }

          if (!wallet) {
            console.error(
              `⚠ DVA transfer ${data.reference} matched no wallet (customer ${customerCode ?? "unknown"})`,
            );
            return { statusCode: 200, message: "Webhook processed" };
          }

          await this.ledger.creditOnce(
            wallet.id,
            {
              type: "deposit",
              amount: data.amount,
              reference: data.reference,
              description: "Bank transfer to dedicated account",
            },
            true,
          );

          return { statusCode: 200, message: "Deposit confirmed" };
        }

        // Wallet deposits don't have corresponding order records
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
        } catch {
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

    /*
     * failed and reversed matter as much as success: both mean the money came
     * back and the buyer's debit has to be returned. Only success was routed
     * here before, so failed transfers sat pending forever.
     */
    if (
      typedEvent.event === "transfer.success" ||
      typedEvent.event === "transfer.failed" ||
      typedEvent.event === "transfer.reversed"
    ) {
      const data = typedEvent.data as {
        reference?: string;
        status?: string;
        amount?: number;
      };

      if (!data.reference) {
        throw new BadRequestException("No reference in webhook data");
      }

      try {
        console.error(
          `📍 WITHDRAWAL WEBHOOK: ${data.reference} (${typedEvent.event})`,
        );
        await this.withdrawalService.handleWithdrawalWebhook(
          typedEvent as Record<string, unknown>,
        );
        console.error(
          `✅ Withdrawal ${data.reference} status updated to ${data.status}`,
        );
        return { statusCode: 200, message: "Withdrawal processed" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `Withdrawal webhook processing error for ${data.reference}: ${msg}`,
        );
        return { statusCode: 200, message: "Webhook processed" };
      }
    }

    return { statusCode: 200, message: "Event processed" };
  }

  private verifyPaystackSignature(
    rawBody: Buffer | undefined,
    body: unknown,
    signature: string,
    secret: string,
  ): boolean {
    // Falls back to the re-serialised body only if rawBody is unavailable.
    const payload = rawBody ?? Buffer.from(JSON.stringify(body));

    const hash = crypto
      .createHmac("sha512", secret)
      .update(payload)
      .digest("hex");

    const expected = Buffer.from(hash);
    const provided = Buffer.from(signature);

    if (expected.length !== provided.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, provided);
  }
}
