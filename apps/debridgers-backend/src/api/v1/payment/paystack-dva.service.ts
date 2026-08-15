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

    if (!data.status) {
      this.logger.error(`Failed to create Paystack customer: ${data.message}`);
      throw new BadRequestException(
        `Failed to create customer: ${data.message ?? "Unknown error"}`,
      );
    }

    return data.data!;
  }

  async assignDvaToCustomer(
    customerCode: string,
    dto: CreateCustomerDto,
  ): Promise<{
    account_number: string;
    bank: string;
    account_name: string;
  }> {
    const response = await fetch(`${this.baseUrl}/dedicated_account/assign`, {
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
        preferred_bank: "wema-bank",
        country: "NG",
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: {
        account_number: string;
        bank: string;
        account_name: string;
      };
    };

    if (!data.status) {
      this.logger.error(`Failed to assign DVA: ${data.message}`);
      throw new BadRequestException(
        `Failed to create account: ${data.message ?? "Unknown error"}`,
      );
    }

    return data.data!;
  }

  async createDvaForUser(
    userId: number,
    dto: CreateCustomerDto,
  ): Promise<{
    account_number: string;
    bank_name: string;
    account_name: string;
  }> {
    // Step 1: Create Paystack customer
    const customer = await this.createPaystackCustomer(dto);
    this.logger.log(
      `Created Paystack customer ${customer.customer_code} for user ${userId}`,
    );

    // Step 2: Assign DVA to customer
    const dva = await this.assignDvaToCustomer(customer.customer_code, dto);
    this.logger.log(
      `Created DVA ${dva.account_number} for customer ${customer.customer_code}`,
    );

    // Step 3: Update buyer wallet with DVA details
    await this.db
      .update(schema.buyerWallets)
      .set({
        paystack_customer_code: customer.customer_code,
        account_number: dva.account_number,
        bank_name: dva.bank,
        account_name: dva.account_name,
      })
      .where(eq(schema.buyerWallets.user_id, userId));

    this.logger.log(`Updated wallet for user ${userId} with DVA details`);

    return {
      account_number: dva.account_number,
      bank_name: dva.bank,
      account_name: dva.account_name,
    };
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
