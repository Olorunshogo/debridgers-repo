import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

@Injectable()
export class PaystackInvoiceService {
  private readonly logger = new Logger(PaystackInvoiceService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    private readonly config: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") ?? "";
  }

  /**
   * Create a Paystack invoice for an order.
   * Invoice will show in Paystack dashboard Orders section.
   * Customer can pay via link or we pay via transfer.
   */
  async createInvoice(
    orderId: number,
    buyerId: number,
    amount: number, // in kobo
    orderReference: string,
    buyerEmail: string,
    _buyerName: string,
  ): Promise<{
    invoice_code: string;
    invoice_number: number;
    payment_url: string;
  }> {
    const response = await fetch(`${this.baseUrl}/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: buyerEmail,
        amount,
        description: `Order #${orderReference}`,
        line_items: [
          {
            name: `Debridgers Order #${orderReference}`,
            amount,
            quantity: 1,
          },
        ],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
        metadata: {
          order_id: orderId,
          buyer_id: buyerId,
          order_reference: orderReference,
        },
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: {
        id: number;
        invoice_code: string;
        invoice_number: number;
        payment_url: string;
      };
    };

    if (!data.status || !data.data) {
      this.logger.error(`Failed to create invoice: ${data.message}`);
      throw new BadRequestException(
        `Invoice creation failed: ${data.message ?? "Unknown error"}`,
      );
    }

    this.logger.log(
      `Created Paystack invoice ${data.data.invoice_code} for order ${orderReference}`,
    );

    return {
      invoice_code: data.data.invoice_code,
      invoice_number: data.data.invoice_number,
      payment_url: data.data.payment_url,
    };
  }

  /**
   * Mark invoice as paid in Paystack.
   * This finalizes the invoice in Paystack dashboard.
   */
  async markInvoiceAsPaid(
    invoiceCode: string,
    paymentMethod: string,
  ): Promise<{ success: boolean; status: string }> {
    const response = await fetch(
      `${this.baseUrl}/invoices/mark/${invoiceCode}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "success",
          payment_method: paymentMethod,
          paid_by: new Date().toISOString(),
        }),
      },
    );

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
    };

    if (!data.status) {
      this.logger.warn(
        `Could not mark invoice as paid in Paystack: ${data.message}`,
      );
      // Non-fatal: continue even if Paystack marking fails
      return { success: false, status: "warning" };
    }

    this.logger.log(`Marked invoice ${invoiceCode} as paid in Paystack`);
    return { success: true, status: "success" };
  }

  /**
   * Get invoice details from Paystack.
   */
  async getInvoice(invoiceCode: string): Promise<{
    invoice_code: string;
    status: string;
    amount: number;
    paid_at?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/invoices/${invoiceCode}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const data = (await response.json()) as {
      status: boolean;
      data?: {
        invoice_code: string;
        status: string;
        amount: number;
        paid_at?: string;
      };
    };

    if (!data.status || !data.data) {
      throw new BadRequestException("Invoice not found in Paystack");
    }

    return data.data;
  }
}
