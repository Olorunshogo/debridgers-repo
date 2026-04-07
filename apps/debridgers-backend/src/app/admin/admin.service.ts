import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, count, sum, and } from "drizzle-orm";
import * as crypto from "crypto";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { PromoteManagerDto } from "./dto/promote-manager.dto";
import { ReviewKycDto } from "./dto/review-kyc.dto";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [agentStats] = await this.db
      .select({ total: count() })
      .from(schema.agent_profiles);

    const [pendingStats] = await this.db
      .select({ total: count() })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.status, "pending"));

    const [buyerStats] = await this.db
      .select({ total: count() })
      .from(schema.users)
      .where(eq(schema.users.role, "buyer"));

    const [orderStats] = await this.db
      .select({ total: count() })
      .from(schema.orders);

    const [revenueStats] = await this.db
      .select({ total: sum(schema.orders.total_amount) })
      .from(schema.orders)
      .where(eq(schema.orders.status, "delivered"));

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
        total_buyers: buyerStats?.total ?? 0,
        total_orders: orderStats?.total ?? 0,
        total_revenue: revenueStats?.total ?? 0,
        pending_commissions: commissionStats?.total ?? "0.00",
        total_leads: leadStats?.total ?? 0,
      },
    };
  }

  // ─── Agents ─────────────────────────────────────────────────────────────────

  async getAgents(status?: "pending" | "approved" | "rejected" | "suspended") {
    const query = this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        status: schema.agent_profiles.status,
        address: schema.agent_profiles.address,
        state: schema.agent_profiles.state,
        lga: schema.agent_profiles.lga,
        is_state_manager: schema.agent_profiles.is_state_manager,
        managed_state: schema.agent_profiles.managed_state,
        admin_notes: schema.agent_profiles.admin_notes,
        referral_buyer_code: schema.agent_profiles.referral_buyer_code,
        referral_agent_code: schema.agent_profiles.referral_agent_code,
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

  async getAgentById(agentId: number) {
    const [agent] = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        is_email_verified: schema.users.is_email_verified,
        status: schema.agent_profiles.status,
        address: schema.agent_profiles.address,
        state: schema.agent_profiles.state,
        lga: schema.agent_profiles.lga,
        nin: schema.agent_profiles.nin,
        id_type: schema.agent_profiles.id_type,
        id_front_url: schema.agent_profiles.id_front_url,
        id_selfie_url: schema.agent_profiles.id_selfie_url,
        cv_url: schema.agent_profiles.cv_url,
        bank_name: schema.agent_profiles.bank_name,
        bank_account_number: schema.agent_profiles.bank_account_number,
        bank_account_name: schema.agent_profiles.bank_account_name,
        is_state_manager: schema.agent_profiles.is_state_manager,
        managed_state: schema.agent_profiles.managed_state,
        referred_by_agent_id: schema.agent_profiles.referred_by_agent_id,
        referral_buyer_code: schema.agent_profiles.referral_buyer_code,
        referral_agent_code: schema.agent_profiles.referral_agent_code,
        target: schema.agent_profiles.target,
        admin_notes: schema.agent_profiles.admin_notes,
        paystack_subaccount_code:
          schema.agent_profiles.paystack_subaccount_code,
        applied_at: schema.users.created_at,
      })
      .from(schema.users)
      .innerJoin(
        schema.agent_profiles,
        eq(schema.agent_profiles.user_id, schema.users.id),
      )
      .where(eq(schema.users.id, agentId))
      .limit(1);

    if (!agent) throw new NotFoundException("Agent not found");

    const [walletRow] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.agent_id, agentId))
      .limit(1);

    const [commissionTotal] = await this.db
      .select({ total: sum(schema.commissions.amount) })
      .from(schema.commissions)
      .where(
        and(
          eq(schema.commissions.agent_id, agentId),
          eq(schema.commissions.status, "confirmed"),
        ),
      );

    return {
      message: "Agent retrieved",
      data: {
        ...agent,
        wallet: walletRow ?? null,
        total_confirmed_commissions: commissionTotal?.total ?? "0.00",
      },
    };
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
      // Generate unique referral codes
      const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. A3F2B1C9
      const buyerCode = `BUYER-${code}`;
      const agentCode = `AGENT-${code}`;

      await this.db
        .update(schema.agent_profiles)
        .set({
          referral_buyer_code: buyerCode,
          referral_agent_code: agentCode,
        })
        .where(eq(schema.agent_profiles.user_id, agentId));

      // Create wallet if it doesn't exist yet
      const [existingWallet] = await this.db
        .select()
        .from(schema.wallets)
        .where(eq(schema.wallets.agent_id, agentId))
        .limit(1);

      if (!existingWallet) {
        await this.db.insert(schema.wallets).values({ agent_id: agentId });
      }

      this.eventEmitter.emit(USER_EVENTS.AGENT_APPROVED, {
        name,
        email: user.email,
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

  async suspendAgent(agentId: number) {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent not found");

    await this.db
      .update(schema.agent_profiles)
      .set({ status: "suspended" })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return { message: "Agent suspended", data: null };
  }

  async unsuspendAgent(agentId: number) {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent not found");

    await this.db
      .update(schema.agent_profiles)
      .set({ status: "approved" })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return { message: "Agent unsuspended", data: null };
  }

  async promoteToStateManager(agentId: number, dto: PromoteManagerDto) {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(
        and(
          eq(schema.agent_profiles.user_id, agentId),
          eq(schema.agent_profiles.status, "approved"),
        ),
      )
      .limit(1);

    if (!profile) throw new NotFoundException("Approved agent not found");

    await this.db
      .update(schema.agent_profiles)
      .set({ is_state_manager: true, managed_state: dto.managed_state })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return { message: "Agent promoted to State Manager", data: null };
  }

  async getPendingKyc() {
    const agents = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        kyc_status: schema.agent_profiles.kyc_status,
        id_type: schema.agent_profiles.id_type,
        id_front_url: schema.agent_profiles.id_front_url,
        id_selfie_url: schema.agent_profiles.id_selfie_url,
        bank_name: schema.agent_profiles.bank_name,
        bank_account_number: schema.agent_profiles.bank_account_number,
        bank_account_name: schema.agent_profiles.bank_account_name,
      })
      .from(schema.users)
      .innerJoin(
        schema.agent_profiles,
        eq(schema.agent_profiles.user_id, schema.users.id),
      )
      .where(eq(schema.agent_profiles.kyc_status, "submitted"))
      .orderBy(desc(schema.users.created_at));

    return { message: "Pending KYC list retrieved", data: agents };
  }

  async reviewKyc(agentId: number, dto: ReviewKycDto) {
    const { action, reason } = dto;
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(
        and(
          eq(schema.agent_profiles.user_id, agentId),
          eq(schema.agent_profiles.kyc_status, "submitted"),
        ),
      )
      .limit(1);

    if (!profile)
      throw new NotFoundException("No submitted KYC found for this agent");

    await this.db
      .update(schema.agent_profiles)
      .set({
        kyc_status: action,
        kyc_rejection_reason: action === "rejected" ? (reason ?? null) : null,
      })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return {
      message: `KYC ${action} successfully`,
      data: null,
    };
  }

  async setAgentTarget(agentId: number, target: number) {
    await this.db
      .update(schema.agent_profiles)
      .set({ target })
      .where(eq(schema.agent_profiles.user_id, agentId));

    return { message: "Target updated", data: { agentId, target } };
  }

  // ─── Buyers ─────────────────────────────────────────────────────────────────

  async getBuyers() {
    const buyers = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        is_email_verified: schema.users.is_email_verified,
        is_phone_verified: schema.users.is_phone_verified,
        is_blocked: schema.users.is_blocked,
        zone_id: schema.users.zone_id,
        referred_by_agent_id: schema.users.referred_by_agent_id,
        joined_at: schema.users.created_at,
      })
      .from(schema.users)
      .where(eq(schema.users.role, "buyer"))
      .orderBy(desc(schema.users.created_at));

    return { message: "Buyers retrieved", data: buyers };
  }

  async getBuyerById(buyerId: number) {
    const [buyer] = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        is_email_verified: schema.users.is_email_verified,
        is_phone_verified: schema.users.is_phone_verified,
        is_blocked: schema.users.is_blocked,
        zone_id: schema.users.zone_id,
        referred_by_agent_id: schema.users.referred_by_agent_id,
        joined_at: schema.users.created_at,
      })
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, buyerId))
      .orderBy(desc(schema.orders.created_at));

    return { message: "Buyer retrieved", data: { ...buyer, orders } };
  }

  async toggleBlockBuyer(buyerId: number, block: boolean) {
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    await this.db
      .update(schema.users)
      .set({ is_blocked: block })
      .where(eq(schema.users.id, buyerId));

    return {
      message: block ? "Buyer blocked" : "Buyer unblocked",
      data: null,
    };
  }

  // ─── Stock & Inventory ───────────────────────────────────────────────────────

  async getStockRequests(status?: "pending" | "fulfilled" | "cancelled") {
    const query = this.db
      .select({
        id: schema.stock_requests.id,
        agent_id: schema.stock_requests.agent_id,
        agent_name: schema.users.first_name,
        agent_last_name: schema.users.last_name,
        quantity: schema.stock_requests.quantity,
        status: schema.stock_requests.status,
        amount_to_remit: schema.stock_requests.amount_to_remit,
        amount_remitted: schema.stock_requests.amount_remitted,
        fulfilled_at: schema.stock_requests.fulfilled_at,
        created_at: schema.stock_requests.created_at,
      })
      .from(schema.stock_requests)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.stock_requests.agent_id),
      )
      .orderBy(desc(schema.stock_requests.created_at));

    const requests = status
      ? await query.where(eq(schema.stock_requests.status, status))
      : await query;

    return { message: "Stock requests retrieved", data: requests };
  }

  async fulfilStockRequest(requestId: number, adminId: number) {
    const [request] = await this.db
      .select()
      .from(schema.stock_requests)
      .where(eq(schema.stock_requests.id, requestId))
      .limit(1);

    if (!request) throw new NotFoundException("Stock request not found");

    if (request.status !== "pending") {
      throw new BadRequestException("Only pending requests can be fulfilled");
    }

    await this.db
      .update(schema.stock_requests)
      .set({ status: "fulfilled", fulfilled_at: new Date() })
      .where(eq(schema.stock_requests.id, requestId));

    return { message: "Stock request fulfilled", data: null };
  }

  async recordInventoryReceived(
    quantity: number,
    source: string,
    notes: string | undefined,
    adminId: number,
  ) {
    await this.db.insert(schema.inventory_records).values({
      quantity,
      source,
      notes,
      recorded_by: adminId,
    });

    return { message: "Inventory recorded", data: null };
  }

  async getInventoryStats() {
    const [received] = await this.db
      .select({ total: sum(schema.inventory_records.quantity) })
      .from(schema.inventory_records);

    const [dispatched] = await this.db
      .select({ total: sum(schema.stock_requests.quantity) })
      .from(schema.stock_requests)
      .where(eq(schema.stock_requests.status, "fulfilled"));

    const totalReceived = Number(received?.total ?? 0);
    const totalDispatched = Number(dispatched?.total ?? 0);

    return {
      message: "Inventory stats retrieved",
      data: {
        total_received: totalReceived,
        total_dispatched: totalDispatched,
        current_stock: totalReceived - totalDispatched,
      },
    };
  }

  // ─── Leads ──────────────────────────────────────────────────────────────────

  async getLeads() {
    const leads = await this.db
      .select()
      .from(schema.leads)
      .orderBy(desc(schema.leads.created_at));

    return { message: "Leads retrieved", data: leads };
  }

  // ─── Commissions ────────────────────────────────────────────────────────────

  async markCommissionPaid(commissionId: number) {
    await this.db
      .update(schema.commissions)
      .set({ status: "paid", paid_at: new Date() })
      .where(eq(schema.commissions.id, commissionId));

    return { message: "Commission marked as paid", data: null };
  }
}
