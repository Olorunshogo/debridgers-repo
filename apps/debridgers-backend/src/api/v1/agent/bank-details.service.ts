import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import {
  ResolveBankAccountDto,
  UpdateBankDetailsDto,
} from "./dto/update-bank-details.dto";

/*
 * Agent bank details, and the reason payouts were unreachable before this
 * existed: `agent_profiles.bank_code` had no write path anywhere in the
 * codebase, while `requestWithdrawal` requires it to be non-null. Every agent
 * hit "Add your bank details in settings" against a settings page that had no
 * such field, so POST /agent/withdrawals could not succeed for anyone.
 *
 * KYC collects a bank *name* as free text, which is not enough: a transfer
 * needs the numeric code. Resolving the code here against the live bank list
 * keeps the stored name and code in agreement.
 */

export interface BankOption {
  bankCode: string;
  name: string;
}

interface ResolvedAccount {
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

/* The bank list changes rarely and every agent loading settings asks for it. */
const BANK_LIST_TTL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class BankDetailsService {
  private readonly logger = new Logger(BankDetailsService.name);
  private bankCache: { banks: BankOption[]; expiresAt: number } | null = null;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {}

  /*
   * Mirrors the checkout flow's PAYMENTS_SIMULATED switch so bank details can be
   * exercised end to end before SafeHaven credentials exist.
   */
  private get simulated(): boolean {
    return this.config.get<string>("PAYMENTS_SIMULATED") === "true";
  }

  // === Bank list

  async getBanks() {
    const banks = await this.loadBanks();
    return { message: "Banks retrieved", data: banks };
  }

  private async loadBanks(): Promise<BankOption[]> {
    if (this.bankCache && this.bankCache.expiresAt > Date.now()) {
      return this.bankCache.banks;
    }

    if (this.simulated) {
      const banks = SIMULATED_BANKS;
      this.bankCache = { banks, expiresAt: Date.now() + BANK_LIST_TTL_MS };
      return banks;
    }

    // TODO: Phase 3 - Implement bank lookup with Paystack API
    throw new Error(
      "Bank lookup not yet implemented. Enable PAYMENTS_SIMULATED for development.",
    );
  }

  private async requireBankName(bankCode: string): Promise<string> {
    const banks = await this.loadBanks();
    const match = banks.find((b) => b.bankCode === bankCode);
    if (!match) {
      throw new BadRequestException(
        "That bank is not on our list. Pick one from the dropdown.",
      );
    }
    return match.name;
  }

  // === Account resolution

  /*
   * Confirms an account exists and belongs to whom the agent expects, before
   * anything is saved. The agent sees the resolved name and confirms it, which
   * is the only guard against a typo sending money to a stranger.
   */
  async resolve(dto: ResolveBankAccountDto): Promise<{
    message: string;
    data: { account_name: string; bank_name: string };
  }> {
    const bankName = await this.requireBankName(dto.bank_code);

    if (this.simulated) {
      return {
        message: "Account resolved",
        data: {
          account_name: `SIMULATED ACCOUNT ${dto.account_number.slice(-4)}`,
          bank_name: bankName,
        },
      };
    }

    // TODO: Phase 3 - Implement account verification with Paystack API
    throw new Error(
      "Account verification not yet implemented. Enable PAYMENTS_SIMULATED for development.",
    );
  }

  // === Read

  async getBankDetails(user: JwtPayload) {
    const [profile] = await this.db
      .select({
        bank_name: schema.agent_profiles.bank_name,
        bank_code: schema.agent_profiles.bank_code,
        bank_account_number: schema.agent_profiles.bank_account_number,
        bank_account_name: schema.agent_profiles.bank_account_name,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, user.sub))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent profile not found");

    /*
     * `is_complete` is what the wallet page keys its payout button on, so the
     * frontend never has to re-derive which combination of columns counts.
     */
    return {
      message: "Bank details retrieved",
      data: {
        ...profile,
        is_complete: Boolean(
          profile.bank_name &&
          profile.bank_code &&
          profile.bank_account_number &&
          profile.bank_account_name,
        ),
      },
    };
  }

  // === Write

  async updateBankDetails(dto: UpdateBankDetailsDto, user: JwtPayload) {
    const [profile] = await this.db
      .select({ status: schema.agent_profiles.status })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, user.sub))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent profile not found");

    const resolved = await this.resolveForSave(dto);

    await this.db
      .update(schema.agent_profiles)
      .set({
        bank_code: resolved.bank_code,
        bank_name: resolved.bank_name,
        bank_account_number: resolved.account_number,
        bank_account_name: resolved.account_name,
      })
      .where(eq(schema.agent_profiles.user_id, user.sub));

    this.logger.log(`Bank details updated for agent ${user.sub}`);

    return {
      message: "Bank details saved",
      data: {
        bank_code: resolved.bank_code,
        bank_name: resolved.bank_name,
        bank_account_number: resolved.account_number,
        bank_account_name: resolved.account_name,
        is_complete: true,
      },
    };
  }

  /*
   * The account name is always taken from the resolution call, never from the
   * client, so a saved name cannot disagree with the account that will be paid.
   */
  private async resolveForSave(
    dto: UpdateBankDetailsDto,
  ): Promise<ResolvedAccount> {
    const { data } = await this.resolve(dto);
    return {
      bank_code: dto.bank_code,
      bank_name: data.bank_name,
      account_number: dto.account_number,
      account_name: data.account_name,
    };
  }

  // === Backfill

  /*
   * Existing agents submitted KYC before `bank_code` was captured, so they hold
   * a bank name and account number but no code. Matches the stored name against
   * the live bank list and fills the code in where it is unambiguous.
   *
   * Deliberately conservative: an unmatched or ambiguous name is reported rather
   * than guessed, because a wrong code sends money to the wrong institution.
   */
  async backfillBankCodes(): Promise<{
    message: string;
    data: {
      updated: number;
      unmatched: { user_id: number; bank_name: string | null }[];
    };
  }> {
    const banks = await this.loadBanks();

    const rows = await this.db
      .select({
        user_id: schema.agent_profiles.user_id,
        bank_name: schema.agent_profiles.bank_name,
        bank_code: schema.agent_profiles.bank_code,
      })
      .from(schema.agent_profiles);

    const normalise = (value: string): string =>
      value
        .toLowerCase()
        .replace(/\b(bank|plc|limited|ltd|nigeria)\b/g, "")
        .replace(/[^a-z0-9]/g, "");

    const unmatched: { user_id: number; bank_name: string | null }[] = [];
    let updated = 0;

    for (const row of rows) {
      if (row.bank_code) continue;
      if (!row.bank_name) {
        unmatched.push({ user_id: row.user_id, bank_name: row.bank_name });
        continue;
      }

      const target = normalise(row.bank_name);
      const matches = banks.filter((b) => normalise(b.name) === target);

      if (matches.length !== 1) {
        unmatched.push({ user_id: row.user_id, bank_name: row.bank_name });
        continue;
      }

      await this.db
        .update(schema.agent_profiles)
        .set({ bank_code: matches[0].bankCode, bank_name: matches[0].name })
        .where(eq(schema.agent_profiles.user_id, row.user_id));

      updated += 1;
    }

    this.logger.log(
      `Bank code backfill: ${updated} updated, ${unmatched.length} need manual review`,
    );

    return {
      message: "Backfill complete",
      data: { updated, unmatched },
    };
  }
}

/*
 * Enough real Nigerian bank codes to drive the UI in simulation mode. Replaced
 * by the live SafeHaven list as soon as PAYMENTS_SIMULATED is off.
 */
const SIMULATED_BANKS: BankOption[] = [
  { bankCode: "044", name: "Access Bank" },
  { bankCode: "023", name: "Citibank Nigeria" },
  { bankCode: "050", name: "Ecobank Nigeria" },
  { bankCode: "070", name: "Fidelity Bank" },
  { bankCode: "011", name: "First Bank of Nigeria" },
  { bankCode: "214", name: "First City Monument Bank" },
  { bankCode: "058", name: "Guaranty Trust Bank" },
  { bankCode: "030", name: "Heritage Bank" },
  { bankCode: "301", name: "Jaiz Bank" },
  { bankCode: "082", name: "Keystone Bank" },
  { bankCode: "076", name: "Polaris Bank" },
  { bankCode: "101", name: "Providus Bank" },
  { bankCode: "221", name: "Stanbic IBTC Bank" },
  { bankCode: "068", name: "Standard Chartered Bank" },
  { bankCode: "232", name: "Sterling Bank" },
  { bankCode: "100", name: "Suntrust Bank" },
  { bankCode: "032", name: "Union Bank of Nigeria" },
  { bankCode: "033", name: "United Bank for Africa" },
  { bankCode: "215", name: "Unity Bank" },
  { bankCode: "035", name: "Wema Bank" },
  { bankCode: "057", name: "Zenith Bank" },
  { bankCode: "999992", name: "OPay" },
  { bankCode: "999991", name: "PalmPay" },
  { bankCode: "50211", name: "Kuda Bank" },
  { bankCode: "090405", name: "Moniepoint MFB" },
];
