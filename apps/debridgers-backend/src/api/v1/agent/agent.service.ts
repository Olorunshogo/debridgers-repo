import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql, desc, sum, and, count } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../../events/event-types/user.event.types";
import { ApplyAgentDto } from "./dto/apply-agent.dto";
import { SubmitReportDto } from "./dto/submit-report.dto";
import { UpdateAgentProfileDto } from "./dto/update-agent-profile.dto";
import { RequestWithdrawalDto } from "./dto/request-withdrawal.dto";
import { WalletService } from "./wallet.service";
import { SystemSettingsService } from "../settings/system-settings.service";
import { percentOfKobo, nairaToKobo } from "../../shared/money";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_NOTIFICATION,
} from "../../shared/order-status";

@Injectable()
export class AgentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
    private readonly walletService: WalletService,
    private readonly settings: SystemSettingsService,
  ) {}

  /*
   * Resolves an agent's delivery zone from the location string they supplied.
   *
   * Matches on EITHER the zone's own name OR one of its areas, because the
   * `agent_profiles.lga` column has carried both over time:
   *  - Signup originally collected an AREA ("Narayi", "Kakuri") and stored it
   *    here, which is what zones.areas holds.
   *  - The settings form now offers real LGA names, and the seeded zones are
   *    themselves named after LGAs ("Kaduna South", "Kaduna North").
   *
   * Matching both keeps existing agent rows resolving exactly as before while
   * letting LGA selection work. Returns null when nothing matches, which is
   * normal for LGAs that have no zone seeded yet.
   */
  private async resolveZoneId(
    location?: string | null,
  ): Promise<number | null> {
    if (!location?.trim()) return null;

    const value = location.trim();
    const [zone] = await this.db
      .select({ id: schema.zones.id })
      .from(schema.zones)
      .where(
        and(
          sql`(lower(${schema.zones.name}) = lower(${value}) or exists (
                select 1 from unnest(${schema.zones.areas}) as area
                where lower(area) = lower(${value})
              ))`,
          eq(schema.zones.is_active, true),
        ),
      )
      .limit(1);

    return zone?.id ?? null;
  }

  async apply(dto: ApplyAgentDto, cvUrl?: string) {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, dto.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Email already registered");
    }

    // Auto-assign zone from the supplied LGA/area
    const zoneId = await this.resolveZoneId(dto.lga);

    // Resolve recruiter from referral agent code if provided
    let referredByAgentId: number | null = null;
    if (dto.referred_by_agent_code) {
      const [recruiterProfile] = await this.db
        .select({ user_id: schema.agent_profiles.user_id })
        .from(schema.agent_profiles)
        .where(
          eq(
            schema.agent_profiles.referral_agent_code,
            dto.referred_by_agent_code,
          ),
        )
        .limit(1);
      if (recruiterProfile) {
        referredByAgentId = recruiterProfile.user_id;
      }
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const verificationToken = this.generateVerificationOtp();
    const verificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    const [user] = await this.db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(schema.users)
        .values({
          first_name: dto.first_name,
          last_name: dto.last_name ?? "",
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          password: hashed,
          role: "agent",
          zone_id: zoneId,
        })
        .returning();

      await tx.insert(schema.email_verification).values({
        user_id: createdUser.id,
        token: verificationToken,
        expires_at: verificationExpiresAt,
      });

      await tx.insert(schema.agent_profiles).values({
        user_id: createdUser.id,
        address: dto.address,
        lga: dto.lga,
        cv_url: cvUrl ?? null,
        status: "pending",
        referred_by_agent_id: referredByAgentId,
      });

      await this.eventEmitter.emitAsync(USER_EVENTS.USER_REGISTERED, {
        name: `${createdUser.first_name} ${createdUser.last_name}`,
        email: createdUser.email,
        otp: verificationToken,
        role: createdUser.role,
      });

      await this.eventEmitter.emitAsync(USER_EVENTS.AGENT_APPLIED, {
        name: `${createdUser.first_name} ${createdUser.last_name}`,
        email: createdUser.email,
      });

      return [createdUser];
    });

    return {
      message:
        "Application submitted. We'll review and get back to you within 48 hours.",
      data: { id: user.id },
    };
  }

  private generateVerificationOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async getProfile(user: JwtPayload) {
    const [agent] = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        status: schema.agent_profiles.status,
        target: schema.agent_profiles.target,
        avatar_url: schema.users.avatar_url,
        cv_url: schema.agent_profiles.cv_url,
        address: schema.agent_profiles.address,
        state: schema.agent_profiles.state,
        lga: schema.agent_profiles.lga,
        /*
         * The Swagger example advertised these but the select never included
         * them, so an approved agent had no way to read the codes they are
         * supposed to share. Referral cannot function without this.
         */
        referral_buyer_code: schema.agent_profiles.referral_buyer_code,
        referral_agent_code: schema.agent_profiles.referral_agent_code,
      })
      .from(schema.users)
      .leftJoin(
        schema.agent_profiles,
        eq(schema.agent_profiles.user_id, schema.users.id),
      )
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!agent) throw new NotFoundException("Agent not found");

    const [earningsSummary] = await this.db
      .select({ total: sum(schema.commissions.amount_kobo) })
      .from(schema.commissions)
      .where(eq(schema.commissions.agent_id, user.sub));

    return {
      message: "Profile retrieved",
      data: { ...agent, total_earnings: earningsSummary?.total ?? "0.00" },
    };
  }

  async updateProfile(dto: UpdateAgentProfileDto, user: JwtPayload) {
    const userUpdates: Partial<typeof schema.users.$inferInsert> = {};
    if (dto.first_name !== undefined) userUpdates.first_name = dto.first_name;
    if (dto.last_name !== undefined) userUpdates.last_name = dto.last_name;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;

    if (Object.keys(userUpdates).length > 0) {
      await this.db
        .update(schema.users)
        .set(userUpdates)
        .where(eq(schema.users.id, user.sub));
    }

    const profileUpdates: Partial<typeof schema.agent_profiles.$inferInsert> =
      {};
    if (dto.address !== undefined) profileUpdates.address = dto.address;
    if (dto.state !== undefined) profileUpdates.state = dto.state;
    if (dto.lga !== undefined) profileUpdates.lga = dto.lga;

    if (Object.keys(profileUpdates).length > 0) {
      await this.db
        .update(schema.agent_profiles)
        .set(profileUpdates)
        .where(eq(schema.agent_profiles.user_id, user.sub));
    }

    /*
     * Zone is derived from LGA, and agents registering through /auth/register no
     * longer supply an LGA at signup, so they start with zone_id null. Re-resolve
     * it here whenever the LGA changes, otherwise those agents would stay
     * permanently zone-less and drop out of zone-scoped stock and commission
     * routing. Same lookup as `apply`.
     */
    if (dto.lga !== undefined) {
      await this.db
        .update(schema.users)
        .set({ zone_id: await this.resolveZoneId(dto.lga) })
        .where(eq(schema.users.id, user.sub));
    }

    return { message: "Profile updated", data: null };
  }

  async updateAvatar(url: string, user: JwtPayload) {
    await this.db
      .update(schema.users)
      .set({ avatar_url: url })
      .where(eq(schema.users.id, user.sub));
  }

  async submitReport(dto: SubmitReportDto, user: JwtPayload) {
    const [profile] = await this.db
      .select({ status: schema.agent_profiles.status })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, user.sub))
      .limit(1);

    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    if (profile.status !== "approved") {
      throw new BadRequestException(
        "Your application must be approved before submitting reports",
      );
    }

    /*
     * The rate was hardcoded at 0.3 here, so every sales report paid 30%
     * regardless of what the admin had set. It now reads the same setting every
     * other commission path reads, and the arithmetic stays in whole kobo.
     */
    const rate = await this.settings.getAgentCommissionRate();
    const commissionKobo = percentOfKobo(
      nairaToKobo(Number(dto.amount)),
      rate * 100,
    );

    const report = await this.db.transaction(async (tx) => {
      const [report] = await tx
        .insert(schema.sales_reports)
        .values({
          agent_id: user.sub,
          pages_sold: dto.pages_sold,
          amount: String(dto.amount),
          notes: dto.notes,
        })
        .returning();

      await tx.insert(schema.commissions).values({
        agent_id: user.sub,
        type: "direct",
        amount_kobo: commissionKobo,
        status: "pending",
      });

      /*
       * The commission row alone doesn't move the needle on what the agent
       * sees - the wallet's pending_balance is what the dashboard reads, so
       * without this a submitted report never showed as pending earnings.
       */
      await this.walletService.credit(
        user.sub,
        commissionKobo,
        { pending: true },
        tx,
      );

      return report;
    });

    return {
      message: "Report submitted successfully",
      data: { report_id: report.id, commission_earned: commissionKobo },
    };
  }

  async getReports(user: JwtPayload) {
    const reports = await this.db
      .select()
      .from(schema.sales_reports)
      .where(eq(schema.sales_reports.agent_id, user.sub))
      .orderBy(desc(schema.sales_reports.created_at));

    return { message: "Reports retrieved", data: reports };
  }

  async getCommissions(user: JwtPayload) {
    const commissions = await this.db
      .select()
      .from(schema.commissions)
      .where(eq(schema.commissions.agent_id, user.sub))
      .orderBy(desc(schema.commissions.created_at));

    return { message: "Commissions retrieved", data: commissions };
  }

  async getLeaderboard() {
    const rows = await this.db
      .select({
        user_id: schema.agent_profiles.user_id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        lga: schema.agent_profiles.lga,
        address: schema.agent_profiles.address,
        total_pages_sold: sum(schema.sales_reports.pages_sold),
      })
      .from(schema.agent_profiles)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.agent_profiles.user_id),
      )
      .leftJoin(
        schema.sales_reports,
        eq(schema.sales_reports.agent_id, schema.agent_profiles.user_id),
      )
      .groupBy(
        schema.agent_profiles.user_id,
        schema.users.first_name,
        schema.users.last_name,
        schema.agent_profiles.lga,
        schema.agent_profiles.address,
      )
      .orderBy(desc(sum(schema.sales_reports.pages_sold)))
      .limit(20);

    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      name: `${r.first_name} ${r.last_name}`.trim(),
      location: r.lga ?? r.address ?? "Unknown",
      bags_sold: Number(r.total_pages_sold ?? 0),
    }));

    return { message: "Leaderboard retrieved", data: leaderboard };
  }

  async getDashboardStats(user: JwtPayload) {
    const [totalBagsSoldRow] = await this.db
      .select({ total: sum(schema.sales_reports.pages_sold) })
      .from(schema.sales_reports)
      .where(eq(schema.sales_reports.agent_id, user.sub));

    const [totalEarnedRow] = await this.db
      .select({ total: sum(schema.commissions.amount_kobo) })
      .from(schema.commissions)
      .where(eq(schema.commissions.agent_id, user.sub));

    const [pendingCommissionRow] = await this.db
      .select({ total: sum(schema.commissions.amount_kobo) })
      .from(schema.commissions)
      .where(
        and(
          eq(schema.commissions.agent_id, user.sub),
          eq(schema.commissions.status, "pending"),
        ),
      );

    const [daysReportedRow] = await this.db
      .select({ total: count() })
      .from(schema.sales_reports)
      .where(eq(schema.sales_reports.agent_id, user.sub));

    const recentReports = await this.db
      .select()
      .from(schema.sales_reports)
      .where(eq(schema.sales_reports.agent_id, user.sub))
      .orderBy(desc(schema.sales_reports.created_at))
      .limit(5);

    const allAgentsRows = await this.db
      .select({
        user_id: schema.sales_reports.agent_id,
        total: sum(schema.sales_reports.pages_sold),
      })
      .from(schema.sales_reports)
      .groupBy(schema.sales_reports.agent_id)
      .orderBy(desc(sum(schema.sales_reports.pages_sold)));

    const myIndex = allAgentsRows.findIndex((r) => r.user_id === user.sub);
    const rank = myIndex >= 0 ? myIndex + 1 : null;

    return {
      message: "Dashboard stats retrieved",
      data: {
        total_bags_sold: Number(totalBagsSoldRow?.total ?? 0),
        total_earned: totalEarnedRow?.total ?? "0.00",
        rank,
        days_reported: daysReportedRow?.total ?? 0,
        commission_pending: pendingCommissionRow?.total ?? "0.00",
        recent_reports: recentReports,
      },
    };
  }

  // === Withdrawals

  /*
   * An agent asks to be paid out. Creates a `pending` withdrawal for admin
   * review and debits the available balance immediately, so the same money
   * cannot be requested twice while the first request is still in the queue.
   *
   * Admin approval and the actual transfer stay where they already are, in
   * PaymentService's payout route - this only opens the request path.
   */
  async requestWithdrawal(dto: RequestWithdrawalDto, user: JwtPayload) {
    const [profile] = await this.db
      .select({
        status: schema.agent_profiles.status,
        bank_name: schema.agent_profiles.bank_name,
        bank_code: schema.agent_profiles.bank_code,
        bank_account_number: schema.agent_profiles.bank_account_number,
        bank_account_name: schema.agent_profiles.bank_account_name,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, user.sub))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent profile not found");
    if (profile.status !== "approved") {
      throw new BadRequestException(
        "Your account must be approved before you can request a payout.",
      );
    }

    if (
      !profile.bank_name ||
      !profile.bank_code ||
      !profile.bank_account_number ||
      !profile.bank_account_name
    ) {
      throw new BadRequestException(
        "Add your bank details in settings before requesting a payout.",
      );
    }

    /*
     * One transaction: never debit without a matching request row. The balance
     * check is the debit's own UPDATE predicate rather than a prior SELECT, so
     * two withdrawals racing cannot both pass it and drain the wallet twice.
     */
    const withdrawal = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.withdrawals)
        .values({
          agent_id: user.sub,
          amount: dto.amount_kobo,
          bank_name: profile.bank_name as string,
          bank_code: profile.bank_code as string,
          bank_account_number: profile.bank_account_number as string,
          bank_account_name: profile.bank_account_name as string,
          status: "pending",
        })
        .returning();

      const debited = await this.walletService.debit(
        user.sub,
        dto.amount_kobo,
        tx,
      );

      if (!debited) {
        throw new BadRequestException(
          "That is more than your available balance.",
        );
      }

      return created;
    });

    return {
      message: "Payout requested. We will review it shortly.",
      data: withdrawal,
    };
  }

  async getWithdrawals(user: JwtPayload) {
    const rows = await this.db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.agent_id, user.sub))
      .orderBy(desc(schema.withdrawals.created_at));

    return { message: "Withdrawals retrieved", data: rows };
  }

  // === Orders

  /*
   * Scoped to buyers this agent referred. An agent has no business reading, let
   * alone moving, an order that belongs to someone else's buyer.
   */
  async getReferredOrders(user: JwtPayload) {
    const buyer = schema.users;

    const rows = await this.db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        quantity: schema.orders.quantity,
        total_amount: schema.orders.total_amount,
        delivery_address: schema.orders.delivery_address,
        created_at: schema.orders.created_at,
        buyer_first_name: buyer.first_name,
        buyer_last_name: buyer.last_name,
        buyer_phone: buyer.phone,
      })
      .from(schema.orders)
      .innerJoin(buyer, eq(schema.orders.buyer_id, buyer.id))
      .where(eq(buyer.referred_by_agent_id, user.sub))
      .orderBy(desc(schema.orders.created_at));

    return { message: "Orders retrieved", data: rows };
  }

  async markOrderOutForDelivery(orderId: number, user: JwtPayload) {
    const [row] = await this.db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        buyer_id: schema.orders.buyer_id,
        referred_by_agent_id: schema.users.referred_by_agent_id,
      })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.orders.buyer_id, schema.users.id))
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!row || row.referred_by_agent_id !== user.sub) {
      throw new NotFoundException("Order not found");
    }

    if (!ORDER_STATUS_TRANSITIONS[row.status].includes("out_for_delivery")) {
      throw new BadRequestException(
        `Cannot move an order from ${row.status} to out_for_delivery`,
      );
    }

    if (row.payment_status !== "paid") {
      throw new BadRequestException(
        "Order must be paid before it goes out for delivery",
      );
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({ status: "out_for_delivery" })
      .where(eq(schema.orders.id, orderId))
      .returning();

    await this.db.insert(schema.notifications).values({
      user_id: row.buyer_id,
      title: ORDER_STATUS_NOTIFICATION.out_for_delivery.title(orderId),
      description: ORDER_STATUS_NOTIFICATION.out_for_delivery.body,
      read: false,
    });

    return { message: "Order marked out for delivery", data: updated };
  }
}
