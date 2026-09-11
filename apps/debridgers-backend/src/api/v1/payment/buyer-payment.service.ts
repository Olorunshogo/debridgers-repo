import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { WalletService } from "../wallet/wallet.service";
import { OrderService } from "../buyer/order.service";
import { NotificationsService } from "../buyer/notifications.service";
import { LedgerService } from "./ledger.service";
import { AdminAccountService } from "./admin-account.service";
import { PaystackInvoiceService } from "./paystack-invoice.service";

@Injectable()
export class BuyerPaymentService {
  private readonly logger = new Logger(BuyerPaymentService.name);
  private readonly PAYSTACK_IPS = [
    "52.31.139.75",
    "52.49.173.169",
    "52.214.14.220",
  ];
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;
  private readonly appUrl: string;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly walletService: WalletService,
    private readonly orderService: OrderService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
    private readonly ledger: LedgerService,
    private readonly adminAccount: AdminAccountService,
    private readonly invoice: PaystackInvoiceService,
  ) {
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") ?? "";
    this.appUrl = this.config.get<string>("APP_URL") ?? "";
  }

  /**
   * Pay order with wallet
   */
  async payWithWallet(userId: number, orderId: number, amount: number) {
    // Verify order exists and belongs to user
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order || order.buyer_id !== userId) {
      throw new NotFoundException("Order not found");
    }

    if (order.payment_status !== "unpaid") {
      throw new BadRequestException("Order already paid");
    }

    /*
     * total_amount here is a placeholder missing a real delivery_fee (see
     * BuyerService.priceBasket's requiresZoneQuote) - nothing may be charged
     * against it until an admin sets a real fee and moves the order out of
     * this status.
     */
    if (order.status === "awaiting_quote") {
      throw new BadRequestException(
        "This order is waiting on a delivery quote and cannot be paid yet.",
      );
    }

    // Verify amount matches order total
    if (amount !== order.total_amount) {
      throw new BadRequestException("Amount does not match order total");
    }

    // Deduct from wallet
    await this.walletService.deductBalance(userId, amount);

    // Create payment record (tracks order payment for admin & Paystack)
    const [_paymentRecord] = await this.db
      // paystack_reference tracks this by order ID in Paystack.
      .insert(schema.paymentRecords)
      .values({
        order_id: orderId,
        buyer_id: userId,
        amount_kobo: amount,
        payment_method: "wallet",
        status: "completed",
        paystack_reference: `order_${orderId}`,
        description: `Wallet payment for order #${order.order_reference || orderId} → DVA 9605038516`,
        completed_at: new Date(),
      })
      .returning();

    // Record transaction in admin ledger (for auditing & filtering)
    await this.adminAccount.creditPlatformAccount(
      amount,
      "order_payment",
      `order_${orderId}`,
      `Order #${order.order_reference || orderId} - wallet payment from user ${userId} → DVA`,
    );

    // Update order status
    await this.orderService.updatePaymentStatus(orderId, "paid");
    await this.orderService.updateOrderStatus(orderId, "confirmed");

    // Mark Paystack invoice as paid (fire-and-forget)
    if (order.paystack_invoice_code) {
      this.invoice
        .markInvoiceAsPaid(order.paystack_invoice_code, "wallet")
        .catch((err) => {
          this.logger.error(
            `Failed to mark invoice as paid in Paystack: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
    }

    // Send payment confirmation notification
    await this.notificationsService.notifyPaymentConfirmed(
      userId,
      orderId,
      amount,
      "wallet",
    );

    // Send order status notification
    await this.notificationsService.notifyOrderStatus(
      userId,
      orderId,
      "confirmed",
      "Your order has been confirmed and will be processed soon.",
    );

    /* A confirmed order is what puts a row on the admin deliveries queue, so
       the notification is the admin's cue to go and verify it. */
    await this.notificationsService.notifyAdmins({
      type: "delivery",
      title: "Order awaiting delivery",
      description: `Order #${orderId} was confirmed and is now waiting for delivery verification.`,
    });

    return {
      order_id: orderId,
      payment_method: "wallet",
      amount_kobo: amount,
      status: "confirmed",
      confirmation_number: `ORD-${orderId}-${new Date().toISOString().split("T")[0]}`,
      estimated_delivery: new Date(
        Date.now() + 48 * 60 * 60 * 1000,
      ).toISOString(),
    };
  }

  /**
   * Initiate Paystack payment for order
   */
  async initiatePaystackPayment(
    userId: number,
    orderId: number,
    amount: number,
  ) {
    // Verify order exists and belongs to user
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order || order.buyer_id !== userId) {
      throw new NotFoundException("Order not found");
    }

    if (order.payment_status !== "unpaid") {
      throw new BadRequestException("Order already paid");
    }

    if (order.status === "awaiting_quote") {
      throw new BadRequestException(
        "This order is waiting on a delivery quote and cannot be paid yet.",
      );
    }

    // Verify amount matches order total
    if (amount !== order.total_amount) {
      throw new BadRequestException("Amount does not match order total");
    }

    // Get buyer email
    const [buyer] = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!buyer?.email) {
      throw new BadRequestException("Buyer email not found");
    }

    // Call Paystack API to initialize transaction.
    // Pass orderId in metadata so webhook knows this is an order payment.
    // Reference is left undefined so Paystack generates one; we store whatever it returns.
    const initiateResponse = await this.initializePaystackTransaction(
      buyer.email,
      amount,
      undefined,
      orderId,
    );

    const paystackReference = initiateResponse.data.reference;
    this.logger.log(
      `💾 PAYSTACK INITIALIZED: order_id=${orderId}, paystack_ref=${paystackReference}, amount=${amount}`,
    );

    // Store Paystack reference on order so webhook can find it later
    await this.db
      .update(schema.orders)
      .set({ payment_reference: paystackReference })
      .where(eq(schema.orders.id, orderId));

    this.logger.log(
      `✅ PAYMENT REFERENCE STORED ON ORDER: order_id=${orderId}, ref=${paystackReference}`,
    );

    return {
      order_id: orderId,
      payment_method: "paystack",
      authorization_url: initiateResponse.data.authorization_url,
      reference: paystackReference,
      amount_kobo: amount,
    };
  }

  /*
   * Confirms a card payment from the buyer's return leg, so an order is not
   * left unpaid when the webhook is delayed, misconfigured or unreachable.
   * Nothing here trusts the client: the order is resolved from the reference
   * rather than from an id the caller chose, so a reference can only ever
   * settle the one order it was issued for, and it must belong to this buyer
   * for this amount. Safe to run alongside the webhook, since an already-paid
   * order returns unchanged.
   */
  async confirmOrderPayment(userId: number, reference: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.payment_reference, reference))
      .limit(1);

    if (!order) {
      throw new NotFoundException("No order found for that payment reference");
    }

    if (order.buyer_id !== userId) {
      throw new ForbiddenException("This order belongs to another account");
    }

    if (order.payment_status === "paid") {
      return { order_id: order.id, payment_status: "paid", already: true };
    }

    const verified = await this.verifyPaystackTransaction(reference);

    if (verified.status !== "success") {
      throw new BadRequestException(
        `Payment not completed (Paystack status: ${verified.status})`,
      );
    }

    // Settle against what Paystack says was received, never what a client claims.
    if (verified.amount !== order.total_amount) {
      throw new BadRequestException(
        "Paid amount does not match the order total",
      );
    }

    await this.orderService.updatePaymentStatus(order.id, "paid");
    await this.orderService.updateOrderStatus(order.id, "confirmed");

    await this.notificationsService.notifyPaymentConfirmed(
      order.buyer_id,
      order.id,
      order.total_amount,
      "paystack",
    );

    return { order_id: order.id, payment_status: "paid", already: false };
  }

  /*
   * Single place that asks Paystack what actually happened to a reference.
   * Shared by the buyer's return leg and the reconciliation sweep so both
   * read the same source of truth.
   */
  async verifyPaystackTransaction(
    reference: string,
  ): Promise<{ status: string; amount: number }> {
    if (!this.secretKey) {
      throw new BadRequestException("Paystack secret key not configured");
    }

    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const verified = (await response.json()) as {
      status: boolean;
      data?: { status: string; amount: number };
      message?: string;
    };

    if (!verified.status || !verified.data) {
      throw new BadRequestException(
        `Paystack error: ${verified.message ?? "Could not verify transaction"}`,
      );
    }

    return { status: verified.data.status, amount: verified.data.amount };
  }

  /**
   * Call Paystack Initialize Transaction API
   */
  private async initializePaystackTransaction(
    email: string,
    amountKobo: number,
    reference: string | undefined,
    orderId: number,
  ): Promise<{
    status: boolean;
    message: string;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }> {
    if (!this.secretKey) {
      throw new BadRequestException("Paystack secret key not configured");
    }

    try {
      const body: Record<string, unknown> = {
        email,
        amount: amountKobo,
        /*
         * Sent per request rather than relying on the Paystack dashboard's default, which is one field shared by every environment.
         * Without it local, staging and production buyers all return to the same place.
         */
        callback_url: `${this.appUrl}/buyer-dashboard/checkout`,
        metadata: {
          order_id: orderId,
          type: "order_payment",
        },
      };

      // Only include reference if provided
      if (reference) {
        body.reference = reference;
      }

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = (await response.json()) as {
          message?: string;
        };
        const msg = `Paystack API error: ${error.message || "Failed to initialize payment"}`;
        this.logger.error(msg);
        throw new BadRequestException(msg);
      }

      const data = (await response.json()) as {
        status: boolean;
        message: string;
        data: {
          authorization_url: string;
          access_code: string;
          reference: string;
        };
      };
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Paystack initialization error: ${msg}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Paystack initialization failed: ${msg}`);
    }
  }

  /**
   * Confirm Paystack payment and complete order
   */
  async confirmPaystackPayment(reference: string) {
    // Confirm transaction
    const transaction = await this.walletService.confirmTransaction(reference);

    // Find order by reference
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.payment_reference, reference))
      .limit(1);

    if (!order) {
      throw new NotFoundException("Order not found for reference");
    }

    // Update order status
    await this.orderService.updatePaymentStatus(order.id, "paid");
    await this.orderService.updateOrderStatus(order.id, "confirmed");

    return {
      order_id: order.id,
      status: "confirmed",
      amount_kobo: transaction.amount,
      reference: reference,
    };
  }

  /**
   * Verify Paystack webhook signature
   */
  verifyPaystackSignature(body: unknown, signature: string): boolean {
    const paystackSecret = this.config.get<string>("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      throw new BadRequestException("Paystack secret key not configured");
    }

    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(JSON.stringify(body))
      .digest("hex");

    return hash === signature;
  }

  /**
   * Verify request originates from Paystack IP whitelist
   */
  verifyPaystackIP(ipAddress: string): boolean {
    return this.PAYSTACK_IPS.includes(ipAddress);
  }

  /* Supports MTN, Vodafone, AirtelTigo and Telecel; returns a USSD code if the charge is not already complete. */
  async initiateMobileMoneyPayment(params: {
    email: string;
    orderId: number;
    buyerId: number;
    amountKobo: number;
    phoneNumber: string;
    provider: "MTN" | "VODAFONE" | "AIRTELTIGO" | "TELECEL";
  }) {
    const response = await fetch(`${this.baseUrl}/charge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        mobile_money: {
          phone: params.phoneNumber,
          provider: params.provider,
        },
        metadata: {
          type: "buyer_order",
          order_id: params.orderId,
          buyer_id: params.buyerId,
          payment_method: "mobile_money",
        },
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data: {
        reference: string;
        status: "pending" | "success" | "timeout" | "failed";
        display_text?: string;
        access_code?: string;
      };
    };

    if (!data.status) {
      throw new BadRequestException(
        data.message ?? "Mobile Money payment initialization failed",
      );
    }

    const { reference, status } = data.data;

    // If pending, return USSD code. display_text contains the code, e.g. *170*50#.
    if (status === "pending") {
      return {
        reference,
        status: "ussd_pending",
        ussdCode: data.data.display_text || "",
        message: `Dial ${data.data.display_text} to complete payment`,
        pollingUrl: `/api/v1/buyer/orders/${params.orderId}/payment/status/${reference}`,
      };
    }

    // If success, confirm payment immediately
    if (status === "success") {
      await this.confirmPaystackPayment(reference);
      return {
        reference,
        status: "success",
        message: "Payment completed successfully",
      };
    }

    // If timeout or failed
    throw new BadRequestException(
      `Payment failed: ${data.data.display_text || data.message}`,
    );
  }
}
