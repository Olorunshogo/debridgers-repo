import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, count, sum } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAgents(status?: "pending" | "approved" | "rejected") {
    const query = this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        status: schema.agent_profiles.status,
        target: schema.agent_profiles.target,
        cv_url: schema.agent_profiles.cv_url,
        address: schema.agent_profiles.address,
        admin_notes: schema.agent_profiles.admin_notes,
        applied_at: schema.users.created_at,
      })
      .from(schema.users)
      .innerJoin(
        schema.agent_profiles,
        eq(schema.agent_profiles.user_id, schema.users.id),
      )
      .orderBy(desc(schema.users.created_at));

    const agents = status
      ? await query.where(eq(schema.agent_profiles.status, status))
      : await query;

    return { message: "Agents retrieved", data: agents };
  }

  async updateAgentStatus(agentId: number, dto: UpdateAgentStatusDto) {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent not found");

    await this.db
      .update(schema.agent_profiles)
      .set({ status: dto.status, admin_notes: dto.admin_notes })
      .where(eq(schema.agent_profiles.user_id, agentId));

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, agentId))
      .limit(1);

    const name = `${user.first_name} ${user.last_name}`;

    if (dto.status === "approved") {
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashed = await bcrypt.hash(tempPassword, 12);
      await this.db
        .update(schema.users)
        .set({ password: hashed })
        .where(eq(schema.users.id, agentId));

      this.eventEmitter.emit(USER_EVENTS.AGENT_APPROVED, {
        name,
        email: user.email,
        tempPassword,
      });
    } else {
      this.eventEmitter.emit(USER_EVENTS.AGENT_REJECTED, {
        name,
        email: user.email,
        reason: dto.admin_notes,
      });
    }

    return { message: `Agent ${dto.status} successfully`, data: null };
  }

  async setAgentTarget(agentId: number, target: number) {
    await this.db
      .update(schema.agent_profiles)
      .set({ target })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return { message: "Target updated", data: { agentId, target } };
  }

  async getDashboardStats() {
    const [agentStats] = await this.db
      .select({ total: count() })
      .from(schema.agent_profiles);

    const [pendingStats] = await this.db
      .select({ total: count() })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.status, "pending"));

    const [salesStats] = await this.db
      .select({ total: sum(schema.sales_reports.amount) })
      .from(schema.sales_reports);

    const [commissionStats] = await this.db
      .select({ total: sum(schema.commissions.amount) })
      .from(schema.commissions)
      .where(eq(schema.commissions.status, "pending"));

    const [leadStats] = await this.db
      .select({ total: count() })
      .from(schema.leads);

    return {
      message: "Dashboard stats retrieved",
      data: {
        total_agents: agentStats?.total ?? 0,
        pending_agents: pendingStats?.total ?? 0,
        total_sales: salesStats?.total ?? "0.00",
        pending_commissions: commissionStats?.total ?? "0.00",
        total_leads: leadStats?.total ?? 0,
      },
    };
  }

  async getLeads() {
    const leads = await this.db
      .select()
      .from(schema.leads)
      .orderBy(desc(schema.leads.created_at));

    return { message: "Leads retrieved", data: leads };
  }

  async markCommissionPaid(commissionId: number) {
    await this.db
      .update(schema.commissions)
      .set({ status: "paid", paid_at: new Date() })
      .where(eq(schema.commissions.id, commissionId));

    return { message: "Commission marked as paid", data: null };
  }
}
