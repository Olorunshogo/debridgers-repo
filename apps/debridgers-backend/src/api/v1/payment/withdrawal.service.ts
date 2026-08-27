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
import { NotificationsService } from "../buyer/notifications.service";
import { toPaystackAmount, formatNaira } from "../../shared/money";
import { PaystackBankService, type BankOption } from "./paystack-bank.service";
import { LedgerService } from "./ledger.service";

export interface WithdrawalDto {
  amount_kobo: number;
  reason?: string;
}

export interface PayoutAccountDto {
  bank_code: string;
  account_number: string;
}

export interface PayoutAccount {
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
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
    private readonly notificationsService: NotificationsService,
    private readonly bankService: PaystackBankService,
    private readonly ledger: LedgerService,
  ) {
    this.secretKey = this.config.get<string>("PaystackConfig.secretKey") ?? "";
  }

  // === Payout account

  async listBanks(): Promise<BankOption[]> {
    return this.bankService.listBanks();
  }

  /*
   * Resolves the account with Paystack before saving, so the buyer sees the
   * real account name and a typo cannot silently send money to a stranger.
   */
  async setPayoutAccount(
    userId: number,
    dto: PayoutAccountDto,
  ): Promise<PayoutAccount> {
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    const bankName = await this.bankService.requireBankName(dto.bank_code);

    const resolved = await this.bankService.resolveAccount(
      dto.account_number,
      dto.bank_code,
    );

    const recipientCode = await this.bankService.createRecipient(
      dto.account_number,
      dto.bank_code,
      resolved.account_name,
    );

    await this.db
      .update(schema.buyerWallets)
      .set({
        payout_bank_code: dto.bank_code,
        payout_bank_name: bankName,
        payout_account_number: dto.account_number,
        payout_account_name: resolved.account_name,
        paystack_recipient_code: recipientCode,
      })
      .where(eq(schema.buyerWallets.id, wallet.id));

    return {
      bank_code: dto.bank_code,
      bank_name: bankName,
      account_number: dto.account_number,
      account_name: resolved.account_name,
    };
  }

  async getPayoutAccount(userId: number): Promise<PayoutAccount | null> {
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet?.payout_account_number) {
      return null;
    }

    return {
      bank_code: wallet.payout_bank_code ?? "",
      bank_name: wallet.payout_bank_name ?? "",
      account_number: wallet.payout_account_number,
      account_name: wallet.payout_account_name ?? "",
    };
  }

  // === Withdrawal

  async initiateWithdrawal(
    userId: number,
    dto: WithdrawalDto,
  ): Promise<{
    withdrawal_id: number;
    amount_kobo: number;
    reference: string;
    status: string;
  }> {
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    if (!wallet.paystack_recipient_code) {
      throw new BadRequestException(
        "Add a bank account before withdrawing from your wallet.",
      );
    }

    const reference = `WD_${userId}_${Date.now()}`;

    /*
     * Debit and record before calling Paystack, in one transaction. The ledger
     * puts the balance check in the UPDATE's own predicate, so two concurrent
     * withdrawals cannot both pass it and overdraw; if it rejects, nothing was
     * charged. The entry stays pending until the transfer webhook settles it.
     */
    const transaction = await this.db.transaction(async (tx) => {
      const debited = await this.ledger.applyDebit(
        wallet.id,
        dto.amount_kobo,
        tx,
      );

      if (!debited) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${formatNaira(wallet.available_balance)}`,
        );
      }

      return this.ledger.recordEntry(
        wallet.id,
        {
          type: "withdraw",
          amount: dto.amount_kobo,
          status: "pending",
          reference,
          description: dto.reason ?? "Withdrawal to bank account",
        },
        tx,
      );
    });

    let transferData: {
      status: boolean;
      message?: string;
      data?: { transfer_code: string; reference: string; status: string };
    };

    try {
      // Paystack expects kobo for NGN, so amount_kobo goes through unscaled.
      const transferResponse = await fetch(`${this.baseUrl}/transfer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: toPaystackAmount(dto.amount_kobo),
          recipient: wallet.paystack_recipient_code,
          reason: dto.reason ?? "Wallet withdrawal",
          reference,
        }),
      });

      transferData = (await transferResponse.json()) as typeof transferData;
    } catch (err) {
      await this.reverse(transaction.id, wallet.id, dto.amount_kobo);
      this.logger.error(
        `Withdrawal transfer errored for user ${userId}: ${err instanceof Error ? err.message : err}`,
      );
      throw new BadRequestException(
        "Withdrawal failed. Your balance has not been affected.",
      );
    }

    if (!transferData.status || !transferData.data) {
      await this.reverse(transaction.id, wallet.id, dto.amount_kobo);
      this.logger.error(
        `Withdrawal transfer failed for user ${userId}: ${transferData.message}`,
      );
      throw new BadRequestException(
        `Withdrawal failed: ${transferData.message ?? "Unknown error"}`,
      );
    }

    await this.notificationsService.notifyWalletTransaction(
      userId,
      "withdrawal",
      dto.amount_kobo,
      "processing",
    );

    /* Money leaving the platform is the one event admins should never have to
       discover by refreshing the payouts table. */
    await this.notificationsService.notifyAdmins({
      type: "withdrawal",
      title: "Withdrawal initiated",
      description: `A withdrawal of ${formatNaira(dto.amount_kobo)} was initiated by user #${userId} and is processing.`,
    });

    this.logger.log(
      `Initiated withdrawal for user ${userId}: ₦${dto.amount_kobo / 100}`,
    );

    return {
      withdrawal_id: transaction.id,
      amount_kobo: dto.amount_kobo,
      reference,
      status: transferData.data.status,
    };
  }

  /* Undo the debit when the transfer never reached Paystack. */
  private async reverse(
    transactionId: number,
    walletId: number,
    amount: number,
  ): Promise<void> {
    await this.ledger.reverseEntry(transactionId, walletId, amount);
  }

  async handleWithdrawalWebhook(payload: Record<string, unknown>) {
    const data = payload.data as Record<string, unknown>;
    const reference = data.reference as string;

    if (!reference?.startsWith("WD_")) {
      return;
    }

    const transaction = await this.ledger.findEntryByReference(reference);

    if (!transaction) {
      this.logger.warn(`Withdrawal not found for reference ${reference}`);
      return;
    }

    // Paystack retries webhooks, so a settled withdrawal must not move twice.
    if (transaction.status !== "pending") {
      this.logger.log(
        `Withdrawal ${reference} already ${transaction.status}, ignoring replay`,
      );
      return;
    }

    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.id, transaction.wallet_id))
      .limit(1);

    const event = payload.event as string;
    const succeeded = event === "transfer.success";

    if (succeeded) {
      await this.ledger.markEntry(transaction.id, "completed");
    } else {
      /*
       * transfer.failed and transfer.reversed both mean the money came back, so
       * the debit taken at initiation is returned here.
       */
      await this.ledger.reverseEntry(
        transaction.id,
        transaction.wallet_id,
        transaction.amount,
      );

      this.logger.log(
        `Refunded ₦${transaction.amount / 100} to wallet for failed withdrawal ${reference}`,
      );
    }

    if (wallet) {
      await this.notificationsService.notifyWalletTransaction(
        wallet.user_id,
        "withdrawal",
        transaction.amount,
        succeeded ? "completed" : "failed and refunded to your wallet",
      );
    }

    this.logger.log(
      `Withdrawal ${reference} status updated to ${succeeded ? "completed" : "failed"}`,
    );
  }
}
