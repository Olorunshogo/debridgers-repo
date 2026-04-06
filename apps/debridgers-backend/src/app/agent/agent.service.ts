import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql, desc, sum, and } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { ApplyAgentDto } from "./dto/apply-agent.dto";
import { SubmitReportDto } from "./dto/submit-report.dto";
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

    const [user] = await this.db
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

    await this.db.insert(schema.agent_profiles).values({
      user_id: user.id,
      address: dto.address,
      lga: dto.lga,
      cv_url: cvUrl ?? null,
      status: "pending",
      referred_by_agent_id: referredByAgentId,
    });

    this.eventEmitter.emit(USER_EVENTS.AGENT_APPLIED, {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
    });

    return {
      message:
        "Application submitted. We'll review and get back to you within 48 hours.",
      data: { id: user.id },
    };
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

  async submitReport(dto: SubmitReportDto, user: JwtPayload) {
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
}
