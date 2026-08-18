import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/*
 * The single Paystack banking primitive, shared by every role.
 *
 * Buyer withdrawals and agent payouts both need the same three things: the bank
 * list, an account-name resolution before money is committed, and a transfer
 * recipient. Each had grown its own copy, and the agent one was a stub that
 * threw 503 unless PAYMENTS_SIMULATED was on, which meant agents could not add
 * bank details at all whenever simulation was off.
 *
 * Role policy - who may withdraw, what limits apply - stays in the role
 * services. This owns only the gateway calls.
 */

export interface BankOption {
  name: string;
  code: string;
  slug: string;
}

export interface ResolvedAccount {
  account_number: string;
  account_name: string;
}

/* The list changes rarely and every settings page load asks for it. */
const BANK_LIST_TTL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class PaystackBankService {
  private readonly logger = new Logger(PaystackBankService.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;

  private bankCache: { banks: BankOption[]; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.secretKey =
      this.config.get<string>("PaystackConfig.secretKey") ??
      this.config.get<string>("PAYSTACK_SECRET_KEY") ??
      "";
    this.baseUrl =
      this.config.get<string>("PAYSTACK_URL") ?? "https://api.paystack.co";
  }

  // === Banks

  async listBanks(): Promise<BankOption[]> {
    if (this.bankCache && this.bankCache.expiresAt > Date.now()) {
      return this.bankCache.banks;
    }

    const response = await fetch(
      `${this.baseUrl}/bank?country=nigeria&perPage=100`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: Array<{ name: string; code: string; slug: string }>;
    };

    if (!data.status || !data.data) {
      this.logger.error(`Failed to load bank list: ${data.message}`);
      throw new BadRequestException(
        `Could not load banks: ${data.message ?? "Unknown error"}`,
      );
    }

    const banks = data.data.map((b) => ({
      name: b.name,
      code: b.code,
      slug: b.slug,
    }));

    this.bankCache = { banks, expiresAt: Date.now() + BANK_LIST_TTL_MS };

    return banks;
  }

  /*
   * Callers store a bank name alongside the code, so the two must agree. Going
   * through the live list rather than trusting a client-supplied name is what
   * keeps them in step.
   */
  async requireBankName(bankCode: string): Promise<string> {
    const banks = await this.listBanks();
    const match = banks.find((b) => b.code === bankCode);

    if (!match) {
      throw new BadRequestException(
        "That bank is not on our list. Pick one from the dropdown.",
      );
    }

    return match.name;
  }

  // === Account resolution

  /*
   * Confirms the account exists and returns the name it is held in, before
   * anything is saved. Showing that name back to the user is the only guard
   * against a typo sending money to a stranger.
   */
  async resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolvedAccount> {
    const response = await fetch(
      `${this.baseUrl}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { account_number: string; account_name: string };
    };

    if (!data.status || !data.data) {
      throw new BadRequestException(
        `Could not verify account: ${data.message ?? "Unknown error"}`,
      );
    }

    return {
      account_number: data.data.account_number,
      account_name: data.data.account_name,
    };
  }

  // === Transfer recipients

  async createRecipient(
    accountNumber: string,
    bankCode: string,
    accountName: string,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/transferrecipient`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        account_number: accountNumber,
        bank_code: bankCode,
        name: accountName,
        currency: "NGN",
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message?: string;
      data?: { recipient_code: string };
    };

    if (!data.status || !data.data) {
      this.logger.error(`Failed to create transfer recipient: ${data.message}`);
      throw new BadRequestException(
        `Could not set up payout account: ${data.message ?? "Unknown error"}`,
      );
    }

    return data.data.recipient_code;
  }
}
