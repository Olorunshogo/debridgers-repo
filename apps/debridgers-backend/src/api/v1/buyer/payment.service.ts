import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { WalletService } from "./wallet.service";
import { OrderService } from "./order.service";
import { NotificationsService } from "./notifications.service";

@Injectable()
export class PaymentService {
  private readonly PAYSTACK_IPS = [
    "52.31.139.75",
    "52.49.173.169",
    "52.214.14.220",
  ];
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly walletService: WalletService,
    private readonly orderService: OrderService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") ?? "";
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

    // Verify amount matches order total
    if (amount !== order.total_amount) {
      throw new BadRequestException("Amount does not match order total");
    }

    // Deduct from wallet
    await this.walletService.deductBalance(userId, amount);

    // Update order status
    await this.orderService.updatePaymentStatus(orderId, "paid");
    await this.orderService.updateOrderStatus(orderId, "confirmed");

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

    // Create pending transaction in wallet
    const reference = `paystack_order_${orderId}_${Date.now()}`;
    await this.walletService.createPendingTransaction(
      userId,
      amount,
      reference,
    );

    // Store payment reference in order
    await this.db
      .update(schema.orders)
      .set({ payment_reference: reference })
      .where(eq(schema.orders.id, orderId));

    // Call Paystack API to initialize transaction
    const initiateResponse = await this.initializePaystackTransaction(
      buyer.email,
      amount,
      reference,
      orderId,
    );

    return {
      order_id: orderId,
      payment_method: "paystack",
      authorization_url: initiateResponse.data.authorization_url,
      reference: reference,
      amount_kobo: amount,
    };
  }

  /**
   * Call Paystack Initialize Transaction API
   */
  private async initializePaystackTransaction(
    email: string,
    amountKobo: number,
    reference: string,
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
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          reference,
          metadata: {
            order_id: orderId,
            type: "order_payment",
          },
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as {
          message?: string;
        };
        const msg = `Paystack API error: ${error.message || "Failed to initialize payment"}`;
        console.error(msg);
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
      console.error("Paystack initialization error:", msg);
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

  /**
   * Process webhook event asynchronously (doesn't block webhook response)
   */
  private async processWebhookEventAsync(event: unknown): Promise<void> {
    try {
      const { event: eventType, data } = event as {
        event: string;
        data: unknown;
      };

      if (eventType === "charge.success") {
        const { reference, amount } = data as {
          reference: string;
          amount: number;
        };

        // Confirm the payment
        const result = await this.confirmPaystackPayment(reference);

        // Send payment notification
        await this.notificationsService.notifyPaymentConfirmed(
          result.order_id,
          result.order_id,
          amount,
          "paystack",
        );
      } else if (eventType === "charge.dispute.create") {
        // Handle dispute/chargeback
        const { reference, customer } = data as {
          reference: string;
          customer: unknown;
        };
        await this.handleDispute(reference, customer);
      } else if (
        eventType === "refund.processed" ||
        eventType === "refund.succeeded"
      ) {
        // Handle refund - auto-refund wallet
        const { transaction_id, amount } = data as {
          transaction_id: string;
          amount: number;
        };
        await this.handleRefund(transaction_id, amount);
      } else if (eventType === "charge.dispute.resolve") {
        // Dispute resolved
        const { reference, resolution } = data as {
          reference: string;
          resolution: string;
        };
        await this.resolveDispute(reference, resolution);
      }
    } catch (error) {
      console.error("Error processing Paystack webhook event:", error);
      // Don't throw - log and continue
    }
  }

  /**
   * Handle charge dispute/chargeback
   */
  private async handleDispute(
    reference: string,
    _customer: unknown,
  ): Promise<void> {
    // Find order by payment reference
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.payment_reference, reference))
      .limit(1);

    if (!order) return;

    // Update order status to disputed
    await this.orderService.updateOrderStatus(order.id, "disputed");

    // Send notification to buyer
    await this.notificationsService.notifyOrderStatus(
      order.buyer_id,
      order.id,
      "disputed",
      "A dispute has been raised against your payment. Our team will review this shortly.",
    );
  }

  /**
   * Handle refund - auto-refund to wallet
   */
  private async handleRefund(
    transactionId: string,
    amount: number,
  ): Promise<void> {
    // Find order by transaction ID
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.payment_reference, transactionId))
      .limit(1);

    if (!order) return;

    // Refund to wallet
    const refundAmount = Math.floor(amount / 100); // Convert from kobo
    await this.walletService.addBalance(
      order.buyer_id,
      refundAmount,
      `refund_${transactionId}`,
    );

    // Update order status
    await this.orderService.updateOrderStatus(order.id, "refunded");
    await this.orderService.updatePaymentStatus(order.id, "refunded");

    // Notify buyer
    await this.notificationsService.notifyOrderStatus(
      order.buyer_id,
      order.id,
      "refunded",
      `Refund of ₦${refundAmount / 100} has been added to your wallet.`,
    );
  }

  /**
   * Resolve dispute
   */
  private async resolveDispute(
    reference: string,
    resolution: string,
  ): Promise<void> {
    // Find order
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.payment_reference, reference))
      .limit(1);

    if (!order) return;

    const status =
      resolution === "merchant-accepted" ? "confirmed" : "cancelled";
    await this.orderService.updateOrderStatus(order.id, status);

    // Notify buyer
    await this.notificationsService.notifyOrderStatus(
      order.buyer_id,
      order.id,
      status,
      `Dispute has been resolved. Order status: ${status}`,
    );
  }

  /**
   * Handle Paystack webhook event (returns 200 OK immediately)
   * Long-running tasks are processed asynchronously
   */
  handlePaystackWebhook(event: unknown): { success: boolean } {
    // Return 200 OK immediately to Paystack
    // This prevents timeout and retry attempts
    const response = { success: true };

    // Process event asynchronously in the background
    // Use setImmediate to ensure this runs after the response is sent
    setImmediate(() => {
      this.processWebhookEventAsync(event).catch((error) => {
        console.error("Async webhook processing error:", error);
      });
    });

    return response;
  }

  /**
   * Initiate Mobile Money/USSD payment (Paystack Charge API)
   * Supports: MTN, Vodafone, AirtelTigo, Telecel
   * Returns USSD code if needed, or success if completed
   */
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

    // If pending, return USSD code (display_text contains the code)
    if (status === "pending") {
      return {
        reference,
        status: "ussd_pending",
        ussdCode: data.data.display_text || "", // e.g., *170*50#
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
