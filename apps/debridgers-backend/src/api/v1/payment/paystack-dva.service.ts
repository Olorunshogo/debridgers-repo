import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

export interface CreateCustomerDto {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

@Injectable()
export class PaystackDvaService {
  private readonly logger = new Logger(PaystackDvaService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";
  private preferredBank: string | null = null;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
  }

  async createPaystackCustomer(
    dto: CreateCustomerDto,
  ): Promise<{ id: number; customer_code: string }> {
    const response = await fetch(`${this.baseUrl}/customer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: dto.email,
        first_name: dto.firstName,
        last_name: dto.lastName,
        phone: dto.phone,
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { id: number; customer_code: string };
    };

    if (!data.status || !data.data) {
      this.logger.error(`Failed to create Paystack customer: ${data.message}`);
      throw new BadRequestException(
        `Failed to create customer: ${data.message ?? "Unknown error"}`,
      );
    }

    return data.data;
  }

  /*
   * Providers differ between test and live: test integrations only have
   * test-bank, live ones have wema-bank or titan-paystack. Hardcoding
   * "wema-bank" made every test-mode signup fail, so ask Paystack instead.
   */
  private async resolvePreferredBank(): Promise<string> {
    if (this.preferredBank) {
      return this.preferredBank;
    }

    const response = await fetch(
      `${this.baseUrl}/dedicated_account/available_providers`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: Array<{ provider_slug: string }>;
    };

    if (!data.status || !data.data?.length) {
      throw new BadRequestException(
        `No dedicated account providers available: ${data.message ?? "Unknown error"}`,
      );
    }

    const configured = this.config.get<string>("PAYSTACK_PREFERRED_BANK");
    const match = configured
      ? data.data.find((p) => p.provider_slug === configured)
      : undefined;

    this.preferredBank = match?.provider_slug ?? data.data[0].provider_slug;
    return this.preferredBank;
  }

  /*
   * POST /dedicated_account, not /dedicated_account/assign.
   *
   * /assign returns only {status, message: "Assign dedicated account in
   * progress"} - it creates the account asynchronously and carries no account
   * number, so reading data.account_number off it always threw and every buyer
   * silently ended up with no DVA. Creating against an existing customer code
   * returns the account synchronously.
   */
  async createDvaForCustomer(customerCode: string): Promise<{
    account_number: string;
    bank_name: string;
    account_name: string;
  }> {
    const preferredBank = await this.resolvePreferredBank();

    const response = await fetch(`${this.baseUrl}/dedicated_account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: preferredBank,
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: {
        account_number: string;
        account_name: string;
        // An object, not a string - writing it straight into bank_name stored "[object Object]".
        bank: { name: string; id: number; slug: string };
      };
    };

    if (!data.status || !data.data?.account_number) {
      this.logger.error(`Failed to create DVA: ${data.message}`);
      throw new BadRequestException(
        `Failed to create account: ${data.message ?? "Unknown error"}`,
      );
    }

    return {
      account_number: data.data.account_number,
      bank_name: data.data.bank.name,
      account_name: data.data.account_name,
    };
  }

  /*
   * Pure API path: create customer and DVA without DB writes. Returns both
   * account details and customer code for the caller to persist.
   */
  async createDva(dto: CreateCustomerDto): Promise<{
    account_number: string;
    bank_name: string;
    account_name: string;
    customer_code: string;
  }> {
    const customer = await this.createPaystackCustomer(dto);
    this.logger.log(`Created Paystack customer ${customer.customer_code}`);

    const dva = await this.createDvaForCustomer(customer.customer_code);
    this.logger.log(
      `Created DVA ${dva.account_number} for customer ${customer.customer_code}`,
    );

    return {
      account_number: dva.account_number,
      bank_name: dva.bank_name,
      account_name: dva.account_name,
      customer_code: customer.customer_code,
    };
  }

  async createDvaForUser(
    userId: number,
    dto: CreateCustomerDto,
  ): Promise<{
    account_number: string;
    bank_name: string;
    account_name: string;
  }> {
    const dvaWithCustomer = await this.createDva(dto);

    await this.db
      .update(schema.buyerWallets)
      .set({
        paystack_customer_code: dvaWithCustomer.customer_code,
        account_number: dvaWithCustomer.account_number,
        bank_name: dvaWithCustomer.bank_name,
        account_name: dvaWithCustomer.account_name,
      })
      .where(eq(schema.buyerWallets.user_id, userId));

    this.logger.log(`Updated wallet for user ${userId} with DVA details`);

    return {
      account_number: dvaWithCustomer.account_number,
      bank_name: dvaWithCustomer.bank_name,
      account_name: dvaWithCustomer.account_name,
    };
  }

  /*
   * Signup swallows DVA failures so a Paystack outage cannot block
   * registration, which leaves buyers with no account number and no way to
   * withdraw. This lets the wallet page repair that on demand.
   */
  async ensureDvaForUser(userId: number): Promise<{
    account_number: string;
    bank_name: string;
    account_name: string;
  }> {
    const existing = await this.getDvaForUser(userId);
    if (existing) {
      return existing;
    }

    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet) {
      throw new InternalServerErrorException("Wallet not found for buyer");
    }

    // The customer may already exist from a run that failed at the DVA step.
    if (wallet.paystack_customer_code) {
      const dva = await this.createDvaForCustomer(
        wallet.paystack_customer_code,
      );

      await this.db
        .update(schema.buyerWallets)
        .set({
          account_number: dva.account_number,
          bank_name: dva.bank_name,
          account_name: dva.account_name,
        })
        .where(eq(schema.buyerWallets.id, wallet.id));

      return dva;
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new InternalServerErrorException("Buyer not found");
    }

    return this.createDvaForUser(userId, {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone ?? "",
    });
  }

  async getDvaForUser(userId: number): Promise<{
    account_number: string;
    bank_name: string;
    account_name: string;
  } | null> {
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet || !wallet.account_number) {
      return null;
    }

    return {
      account_number: wallet.account_number,
      bank_name: wallet.bank_name || "",
      account_name: wallet.account_name || "",
    };
  }
}
