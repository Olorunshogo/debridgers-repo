import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

export interface WithdrawalDto {
  amount_kobo: number;
  reason?: string;
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
  }

  async initiateWithdrawal(
    userId: number,
    dto: WithdrawalDto,
  ): Promise<{
    withdrawal_id: number;
    amount_kobo: number;
    reference: string;
    status: string;
  }> {
    // Get wallet
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    // Check balance
    if (wallet.available_balance < dto.amount_kobo) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₦${wallet.available_balance / 100}`,
      );
    }

    // Check if user has DVA
    if (!wallet.account_number) {
      throw new BadRequestException(
        "Your account is not yet set up for withdrawals. Please contact support.",
      );
    }

    // Get user details for recipient
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Create recipient in Paystack if not already created
    const recipientResponse = await this.createOrGetRecipient(
      wallet.account_number,
      wallet.account_name || `${user.first_name} ${user.last_name}`,
    );

    if (!recipientResponse.recipient_code) {
      throw new BadRequestException(
        "Failed to set up recipient. Please try again.",
      );
    }

    const reference = `WD_${userId}_${Date.now()}`;

    // Initiate transfer
    const transferResponse = await fetch(`${this.baseUrl}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: dto.amount_kobo / 100, // Convert kobo to naira
        recipient: recipientResponse.recipient_code,
        reason: dto.reason || "Wallet withdrawal",
        reference,
      }),
    });

    const transferData = (await transferResponse.json()) as {
      status: boolean;
      message?: string;
      data?: {
        transfer_code: string;
        reference: string;
        status: string;
        amount: number;
      };
    };

    if (!transferData.status) {
      this.logger.error(
        `Withdrawal transfer failed for user ${userId}: ${transferData.message}`,
      );
      throw new BadRequestException(
        `Withdrawal failed: ${transferData.message ?? "Unknown error"}`,
      );
    }

    // Create withdrawal record with pending status
    const [withdrawal] = await this.db
      .insert(schema.walletTransactions)
      .values({
        wallet_id: wallet.id,
        type: "withdraw",
        amount: dto.amount_kobo,
        status: "pending",
        reference: transferData.data!.reference,
        description: "Withdrawal to bank account",
      })
      .returning();

    this.logger.log(
      `Initiated withdrawal for user ${userId}: ₦${dto.amount_kobo / 100}`,
    );

    return {
      withdrawal_id: withdrawal.id,
      amount_kobo: dto.amount_kobo,
      reference: transferData.data!.reference,
      status: transferData.data!.status,
    };
  }

  private async createOrGetRecipient(
    accountNumber: string,
    accountName: string,
  ): Promise<{ recipient_code: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          account_number: accountNumber,
          bank_code: "035", // Wema Bank code
          name: accountName,
        }),
      });

      const data = (await response.json()) as {
        status: boolean;
        message?: string;
        data?: { recipient_code: string };
      };

      if (!data.status) {
        this.logger.error(
          `Failed to create transfer recipient: ${data.message}`,
        );
        throw new Error(data.message);
      }

      return { recipient_code: data.data!.recipient_code };
    } catch (error) {
      this.logger.error(
        `Error creating transfer recipient:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  async handleWithdrawalWebhook(payload: Record<string, unknown>) {
    const data = payload.data as Record<string, unknown>;
    const reference = data.reference as string;

    if (!reference?.startsWith("WD_")) {
      return;
    }

    const [transaction] = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.reference, reference))
      .limit(1);

    if (!transaction) {
      this.logger.warn(`Withdrawal not found for reference ${reference}`);
      return;
    }

    const status = (data.status as string)?.toLowerCase();
    let txnStatus: "completed" | "failed" | "pending" = "pending";

    if (status === "success") {
      txnStatus = "completed";
    } else if (status === "failed") {
      txnStatus = "failed";

      // Refund to wallet if transfer failed
      const [wallet] = await this.db
        .select()
        .from(schema.buyerWallets)
        .where(eq(schema.buyerWallets.id, transaction.wallet_id))
        .limit(1);

      if (wallet) {
        await this.db
          .update(schema.buyerWallets)
          .set({
            available_balance: wallet.available_balance + transaction.amount,
          })
          .where(eq(schema.buyerWallets.id, wallet.id));

        this.logger.log(
          `Refunded ₦${transaction.amount / 100} to wallet for failed withdrawal ${reference}`,
        );
      }
    }

    await this.db
      .update(schema.walletTransactions)
      .set({
        status: txnStatus,
      })
      .where(eq(schema.walletTransactions.id, transaction.id));

    this.logger.log(`Withdrawal ${reference} status updated to ${txnStatus}`);
  }
}
