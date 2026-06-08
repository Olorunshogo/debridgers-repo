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
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { ApplyAgentDto } from "./dto/apply-agent.dto";
import { SubmitReportDto } from "./dto/submit-report.dto";
import { UpdateAgentProfileDto } from "./dto/update-agent-profile.dto";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@Injectable()
export class AgentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async apply(dto: ApplyAgentDto, cvUrl?: string) {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, dto.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Email already registered");
    }

    // Auto-assign zone from LGA
    const [zone] = await this.db
      .select()
      .from(schema.zones)
      .where(
        and(
          sql`${dto.lga} = ANY(${schema.zones.areas})`,
          eq(schema.zones.is_active, true),
        ),
      )
      .limit(1);

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
          zone_id: zone?.id ?? null,
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
        cv_url: schema.agent_profiles.cv_url,
        address: schema.agent_profiles.address,
        lga: schema.agent_profiles.lga,
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
      .select({ total: sum(schema.commissions.amount) })
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

    if (dto.address !== undefined) {
      await this.db
        .update(schema.agent_profiles)
        .set({ address: dto.address })
        .where(eq(schema.agent_profiles.user_id, user.sub));
    }

    return { message: "Profile updated", data: null };
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

    const commissionAmount = Number(dto.amount) * 0.3;

    const [report] = await this.db
      .insert(schema.sales_reports)
      .values({
        agent_id: user.sub,
        pages_sold: dto.pages_sold,
        amount: String(dto.amount),
        notes: dto.notes,
      })
      .returning();

    await this.db.insert(schema.commissions).values({
      agent_id: user.sub,
      type: "direct",
      amount: String(commissionAmount),
      status: "pending",
    });

    return {
      message: "Report submitted successfully",
      data: { report_id: report.id, commission_earned: commissionAmount },
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
      .select({ total: sum(schema.commissions.amount) })
      .from(schema.commissions)
      .where(eq(schema.commissions.agent_id, user.sub));

    const [pendingCommissionRow] = await this.db
      .select({ total: sum(schema.commissions.amount) })
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
}
