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
export class PaystackSubaccountService {
  private readonly logger = new Logger(PaystackSubaccountService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";
  private platformSubaccountCode: string | null = null;

  constructor(
    private readonly config: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") ?? "";
    this.platformSubaccountCode =
      this.config.get<string>("PAYSTACK_PLATFORM_SUBACCOUNT") ?? null;
  }

  /**
   * Get platform subaccount code for receiving payments.
   * This is the Paystack subaccount where all order payments are transferred.
   * Must be configured in environment: PAYSTACK_PLATFORM_SUBACCOUNT
   */
  getPlatformSubaccount(): string {
    if (!this.platformSubaccountCode) {
      throw new BadRequestException(
        "Platform subaccount not configured. Set PAYSTACK_PLATFORM_SUBACCOUNT in environment.",
      );
    }
    return this.platformSubaccountCode;
  }

  /**
   * Transfer funds to platform subaccount.
   * Called when a user makes a payment (wallet, card, etc).
   * Paystack handles auto-settlement to bank account.
   * amount is in kobo.
   */
  async transferToSubaccount(
    amount: number,
    reference: string,
    description: string,
  ): Promise<{ transfer_code: string; amount: number; reference: string }> {
    const subaccountCode = this.getPlatformSubaccount();

    const response = await fetch(`${this.baseUrl}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      // source is "balance": from the Paystack balance.
      body: JSON.stringify({
        source: "balance",
        amount,
        recipient: subaccountCode,
        reason: description,
        reference,
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: {
        transfer_code: string;
        reference: string;
        amount: number;
      };
    };

    if (!data.status || !data.data) {
      this.logger.error(`Failed to transfer to subaccount: ${data.message}`);
      throw new BadRequestException(
        `Transfer failed: ${data.message ?? "Unknown error"}`,
      );
    }

    this.logger.log(
      `Transferred ${amount} kobo to platform subaccount - ${reference}`,
    );

    return {
      transfer_code: data.data.transfer_code,
      amount: data.data.amount,
      reference: data.data.reference,
    };
  }

  /**
   * Create a new Paystack subaccount (for vendors/agents if needed later).
   * This is a template for future use when agents need their own subaccounts.
   */
  async createSubaccount(
    businessName: string,
    accountNumber: string,
    bankCode: string,
    email: string,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/subaccount`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      // percentage_charge is 0 because the platform fee is handled separately.
      body: JSON.stringify({
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        subaccount_type: "individual",
        contact_email: email,
        percentage_charge: 0,
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { subaccount_code: string };
    };

    if (!data.status || !data.data) {
      this.logger.error(`Failed to create subaccount: ${data.message}`);
      throw new BadRequestException(
        `Subaccount creation failed: ${data.message ?? "Unknown error"}`,
      );
    }

    this.logger.log(
      `Created subaccount for ${businessName}: ${data.data.subaccount_code}`,
    );
    return data.data.subaccount_code;
  }
}
