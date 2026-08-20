import { Injectable, Logger, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

@Injectable()
export class AdminAccountService {
  private readonly logger = new Logger(AdminAccountService.name);
  private platformAccountId: number | null = null;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getPlatformAccount() {
    if (this.platformAccountId) {
      const [account] = await this.db
        .select()
        .from(schema.adminAccounts)
        .where(eq(schema.adminAccounts.id, this.platformAccountId))
        .limit(1);
      return account;
    }

    const [account] = await this.db
      .select()
      .from(schema.adminAccounts)
      .where(eq(schema.adminAccounts.account_type, "platform"))
      .limit(1);

    if (account) {
      this.platformAccountId = account.id;
      return account;
    }

    const [created] = await this.db
      .insert(schema.adminAccounts)
      .values({
        account_type: "platform",
        name: "Debridgers Platform Account",
        balance: 0,
        description: "Main platform merchant account for order payments",
      })
      .returning();

    this.platformAccountId = created.id;
    this.logger.log(`Created platform admin account with ID: ${created.id}`);
    return created;
  }

  async creditPlatformAccount(
    amount: number,
    type: "order_payment" | "manual_adjustment" | "platform_fee",
    reference: string,
    description: string,
  ) {
    const account = await this.getPlatformAccount();

    return await this.db.transaction(async (tx) => {
      await tx
        .update(schema.adminAccounts)
        .set({
          balance: schema.adminAccounts.balance + amount,
          total_received: schema.adminAccounts.total_received + amount,
          updated_at: new Date(),
        })
        .where(eq(schema.adminAccounts.id, account.id));

      const [transaction] = await tx
        .insert(schema.adminTransactions)
        .values({
          admin_account_id: account.id,
          type,
          amount,
          status: "completed",
          reference,
          description,
        })
        .returning();

      this.logger.log(
        `Credited platform account: ${amount} kobo (${type}) - ${reference}`,
      );

      return transaction;
    });
  }

  async debitPlatformAccount(
    amount: number,
    type: "vendor_payout" | "refund" | "manual_adjustment",
    reference: string,
    description: string,
  ) {
    const account = await this.getPlatformAccount();

    return await this.db.transaction(async (tx) => {
      await tx
        .update(schema.adminAccounts)
        .set({
          balance: schema.adminAccounts.balance - amount,
          total_paid_out: schema.adminAccounts.total_paid_out + amount,
          updated_at: new Date(),
        })
        .where(eq(schema.adminAccounts.id, account.id));

      const [transaction] = await tx
        .insert(schema.adminTransactions)
        .values({
          admin_account_id: account.id,
          type,
          amount: -amount,
          status: "completed",
          reference,
          description,
        })
        .returning();

      this.logger.log(
        `Debited platform account: ${amount} kobo (${type}) - ${reference}`,
      );

      return transaction;
    });
  }
}
