import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, asc, desc, count, sum, and, inArray, sql } from "drizzle-orm";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../../events/event-types/user.event.types";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { PromoteManagerDto } from "./dto/promote-manager.dto";
import { ReviewKycDto } from "./dto/review-kyc.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { SystemSettingsService } from "../settings/system-settings.service";
import { AgentWalletService } from "../wallet/agent-wallet.service";
import { TaxonomyService } from "../catalog/taxonomy.service";
import { AuditLogService } from "../../../infrastructure/audit/audit-log.service";
import { parseSort } from "../../../infrastructure/helper/query.helper";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_NOTIFICATION,
  type OrderStatus,
} from "../../shared/order-status";

/*
 * The single source of truth for a setting's starting value. Anything listed
 * here becomes a real `system_settings` row the first time settings are read.
 */
const SETTING_DEFAULTS: Record<string, string> = {
  buyer_referral_discount_kobo: "50000",
  buyer_referral_discount_type: "flat",
  agent_override_rate_percent: "5",
  state_manager_override_rate_percent: "2",
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
    private readonly settings: SystemSettingsService,
    private readonly wallet: AgentWalletService,
    private readonly taxonomy: TaxonomyService,
    private readonly audit: AuditLogService,
  ) {}

  async getAdminMe(userId: number) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        role: schema.users.role,
        admin_tier: schema.users.admin_tier,
        must_change_password: schema.users.must_change_password,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return { message: "Admin profile retrieved", data: user ?? null };
  }

  // === Dashboard

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
      .select({ total: sum(schema.commissions.amount_kobo) })
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
        total_revenue: String(revenueStats?.total ?? 0),
        pending_commissions: String(commissionStats?.total ?? 0),
        total_leads: leadStats?.total ?? 0,
      },
    };
  }

  // === Agents

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
        /* Omitting these made KYC state and the bank-code backfill invisible
           through the API. */
        kyc_status: schema.agent_profiles.kyc_status,
        bank_code: schema.agent_profiles.bank_code,
        bank_name: schema.agent_profiles.bank_name,
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
      .where(eq(schema.wallets.user_id, agentId))
      .limit(1);

    const [commissionTotal] = await this.db
      .select({ total: sum(schema.commissions.amount_kobo) })
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
      // Auto-verify email on approval — admin has vetted the agent
      await this.db
        .update(schema.users)
        .set({ is_email_verified: true })
        .where(eq(schema.users.id, agentId));

      /*
       * Issue referral codes once, on first approval only.
       *
       * This regenerated on every approval, so re-approving an agent silently
       * invalidated every link they had already shared. The COALESCE keeps an
       * existing code and fills in only what is missing.
       *
       * The two codes also used to share one random suffix, which meant
       * publishing the buyer code handed out the agent recruitment code as
       * well. They are now independent.
       */
      await this.issueReferralCodes(agentId);

      // Create wallet if it doesn't exist yet
      const [existingWallet] = await this.db
        .select()
        .from(schema.wallets)
        .where(eq(schema.wallets.user_id, agentId))
        .limit(1);

      if (!existingWallet) {
        await this.db.insert(schema.wallets).values({ user_id: agentId });
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

  async suspendAgent(agentId: number, adminId: number) {
    const [profile] = await this.db
      .select({ user_id: schema.agent_profiles.user_id })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent not found");

    // Suspend the agent
    await this.db
      .update(schema.agent_profiles)
      .set({ status: "suspended" })
      .where(eq(schema.agent_profiles.user_id, agentId));

    await this.audit.record({
      admin_id: adminId,
      action: "agent.suspend",
      resource_type: "agent",
      resource_id: agentId,
    });

    // Get agent name for the notification message
    const [agentUser] = await this.db
      .select({
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
      })
      .from(schema.users)
      .where(eq(schema.users.id, agentId))
      .limit(1);

    const agentName = agentUser
      ? `${agentUser.first_name} ${agentUser.last_name}`.trim()
      : "Your agent";

    // Broadcast to all buyers referred by this agent
    const affectedBuyers = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.referred_by_agent_id, agentId));

    if (affectedBuyers.length > 0) {
      await this.db.insert(schema.notifications).values(
        affectedBuyers.map((b) => ({
          user_id: b.id,
          title: "Agent Account Suspended",
          description: `Your agent ${agentName} has been temporarily suspended. Your orders are not affected. Please contact support for assistance.`,
          read: false,
        })),
      );
    }

    return {
      message: "Agent suspended",
      data: { notified: affectedBuyers.length },
    };
  }

  async unsuspendAgent(agentId: number) {
    const [profile] = await this.db
      .select({ user_id: schema.agent_profiles.user_id })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent not found");

    await this.db
      .update(schema.agent_profiles)
      .set({ status: "approved" })
      .where(eq(schema.agent_profiles.user_id, agentId));

    // Notify buyers that agent is back
    const agentUser = await this.db
      .select({
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
      })
      .from(schema.users)
      .where(eq(schema.users.id, agentId))
      .limit(1);

    const agentName = agentUser[0]
      ? `${agentUser[0].first_name} ${agentUser[0].last_name}`.trim()
      : "Your agent";

    const affectedBuyers = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.referred_by_agent_id, agentId));

    if (affectedBuyers.length > 0) {
      await this.db.insert(schema.notifications).values(
        affectedBuyers.map((b) => ({
          user_id: b.id,
          title: "Agent Account Restored",
          description: `Good news! Your agent ${agentName} has been reinstated and is now active again.`,
          read: false,
        })),
      );
    }

    return {
      message: "Agent unsuspended",
      data: { notified: affectedBuyers.length },
    };
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

  async getPendingKyc(
    kycStatus:
      | "not_submitted"
      | "submitted"
      | "approved"
      | "rejected" = "submitted",
  ) {
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
      .where(eq(schema.agent_profiles.kyc_status, kycStatus))
      .orderBy(desc(schema.users.created_at));

    return { message: "KYC list retrieved", data: agents };
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
    if (target < 0) {
      throw new BadRequestException("Target cannot be negative.");
    }

    /* Returning rows is what distinguishes "updated" from "matched nothing";
       without it this reported success for any id. */
    const [updated] = await this.db
      .update(schema.agent_profiles)
      .set({ target })
      .where(eq(schema.agent_profiles.user_id, agentId))
      .returning();

    if (!updated) throw new NotFoundException("Agent not found");

    return { message: "Target updated", data: { agentId, target } };
  }

  // === Buyers

  // === Orders

  async getAllOrders(
    filters: {
      status?: string;
      payment_status?: string;
      search?: string; // buyer name or email
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    } = {},
  ) {
    const {
      status,
      payment_status,
      search,
      page = 1,
      limit = 50,
      sort,
      order,
    } = filters;
    const offset = (page - 1) * limit;

    const buyer = schema.users;

    /* The endpoint's own sortable surface. Add a key here, not a branch. */
    const sorted = parseSort(
      sort,
      order,
      {
        id: schema.orders.id,
        created_at: schema.orders.created_at,
        total_amount: schema.orders.total_amount,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        buyer_name: buyer.first_name,
        delivered_at: schema.orders.delivered_at,
      },
      "created_at",
    );
    const orderBy =
      sorted.direction === "asc" ? asc(sorted.column) : desc(sorted.column);

    /* Shared with the count query below, which otherwise totals the whole table. */
    const whereClause = and(
      status
        ? eq(schema.orders.status, status as typeof schema.orders.status._.data)
        : undefined,
      payment_status
        ? eq(
            schema.orders.payment_status,
            payment_status as typeof schema.orders.payment_status._.data,
          )
        : undefined,
      search
        ? sql`(lower(${buyer.first_name}) || ' ' || lower(${buyer.last_name}) like ${"%" + search.toLowerCase() + "%"} or lower(${buyer.email}) like ${"%" + search.toLowerCase() + "%"})`
        : undefined,
    );

    const rows = await this.db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        order_mode: schema.orders.order_mode,
        quantity: schema.orders.quantity,
        unit_price: schema.orders.unit_price,
        handling_fee: schema.orders.handling_fee,
        delivery_fee: schema.orders.delivery_fee,
        total_amount: schema.orders.total_amount,
        delivery_address: schema.orders.delivery_address,
        payment_reference: schema.orders.payment_reference,
        paid_at: schema.orders.paid_at,
        delivered_at: schema.orders.delivered_at,
        created_at: schema.orders.created_at,
        zone_name: schema.zones.name,
        buyer_id: buyer.id,
        buyer_first_name: buyer.first_name,
        buyer_last_name: buyer.last_name,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone,
      })
      .from(schema.orders)
      .innerJoin(buyer, eq(schema.orders.buyer_id, buyer.id))
      .leftJoin(schema.zones, eq(schema.orders.zone_id, schema.zones.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(schema.orders)
      .innerJoin(buyer, eq(schema.orders.buyer_id, buyer.id))
      .where(whereClause);

    return {
      message: "Orders retrieved",
      data: rows,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        sort: sorted.key,
        order: sorted.direction,
      },
    };
  }

  async getOrderById(orderId: number) {
    const buyer = schema.users;
    const [order] = await this.db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        order_mode: schema.orders.order_mode,
        quantity: schema.orders.quantity,
        unit_price: schema.orders.unit_price,
        handling_fee: schema.orders.handling_fee,
        delivery_fee: schema.orders.delivery_fee,
        total_amount: schema.orders.total_amount,
        delivery_address: schema.orders.delivery_address,
        payment_reference: schema.orders.payment_reference,
        virtual_account_number: schema.orders.virtual_account_number,
        virtual_account_bank: schema.orders.virtual_account_bank,
        virtual_account_expires_at: schema.orders.virtual_account_expires_at,
        paid_at: schema.orders.paid_at,
        delivered_at: schema.orders.delivered_at,
        cancellation_reason: schema.orders.cancellation_reason,
        notes: schema.orders.notes,
        created_at: schema.orders.created_at,
        zone_name: schema.zones.name,
        zone_id: schema.orders.zone_id,
        buyer_id: buyer.id,
        buyer_first_name: buyer.first_name,
        buyer_last_name: buyer.last_name,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone,
      })
      .from(schema.orders)
      .innerJoin(buyer, eq(schema.orders.buyer_id, buyer.id))
      .leftJoin(schema.zones, eq(schema.orders.zone_id, schema.zones.id))
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException("Order not found");
    return { message: "Order retrieved", data: order };
  }

  /*
   * The only path that moves an order past "confirmed". Until this existed
   * nothing set out_for_delivery or delivered, which left every buyer's
   * spending chart and lifetime-spend permanently at zero, since both aggregate
   * on status = 'delivered'.
   */
  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
    adminId: number,
  ) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException("Order not found");

    if (order.status === status) {
      return { message: "Order already in that status", data: order };
    }

    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot move an order from ${order.status} to ${status}`,
      );
    }

    if (status === "out_for_delivery" && order.payment_status !== "paid") {
      throw new BadRequestException(
        "Order must be paid before it goes out for delivery",
      );
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({
        status,
        ...(status === "delivered" ? { delivered_at: new Date() } : {}),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    await this.db.insert(schema.notifications).values({
      user_id: order.buyer_id,
      title: ORDER_STATUS_NOTIFICATION[status].title(orderId),
      description: ORDER_STATUS_NOTIFICATION[status].body,
      read: false,
    });

    this.logger.log(
      `Admin ${adminId} moved order ${orderId} from ${order.status} to ${status}`,
    );

    return { message: "Order status updated", data: updated };
  }

  async getBuyers(zoneId?: number, isSuspended?: boolean, isBlocked?: boolean) {
    const whereConditions = [eq(schema.users.role, "buyer")];

    if (zoneId !== undefined) {
      whereConditions.push(eq(schema.users.zone_id, zoneId));
    }

    if (isSuspended !== undefined) {
      whereConditions.push(eq(schema.users.is_suspended, isSuspended));
    }

    if (isBlocked !== undefined) {
      whereConditions.push(eq(schema.users.is_blocked, isBlocked));
    }

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
        is_suspended: schema.users.is_suspended,
        zone_id: schema.users.zone_id,
        zone_name: schema.zones.name,
        referred_by_agent_id: schema.users.referred_by_agent_id,
        joined_at: schema.users.created_at,
      })
      .from(schema.users)
      .leftJoin(schema.zones, eq(schema.users.zone_id, schema.zones.id))
      .where(and(...whereConditions))
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
        /* Present so the suspend mutation is verifiable from this endpoint;
           without it an admin cannot confirm their own action took effect. */
        is_suspended: schema.users.is_suspended,
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

  async toggleBlockBuyer(buyerId: number, block: boolean, adminId: number) {
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

    await this.audit.record({
      admin_id: adminId,
      action: block ? "buyer.block" : "buyer.unblock",
      resource_type: "buyer",
      resource_id: buyerId,
    });

    return {
      message: block ? "Buyer blocked" : "Buyer unblocked",
      data: null,
    };
  }

  async suspendBuyer(buyerId: number) {
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    await this.db
      .update(schema.users)
      .set({ is_suspended: true })
      .where(eq(schema.users.id, buyerId));

    return {
      message: "Buyer suspended",
      data: null,
    };
  }

  async unsuspendBuyer(buyerId: number) {
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    await this.db
      .update(schema.users)
      .set({ is_suspended: false })
      .where(eq(schema.users.id, buyerId));

    return {
      message: "Buyer unsuspended",
      data: null,
    };
  }

  async getBuyerWalletTransactions(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verify buyer exists
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.role, "buyer")))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    // Get or create wallet
    let [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, userId))
      .limit(1);

    if (!wallet) {
      const [newWallet] = await this.db
        .insert(schema.buyerWallets)
        .values({ user_id: userId })
        .returning();
      wallet = newWallet;
    }

    const offset = (page - 1) * limit;

    const [transactions, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.walletTransactions)
        .where(eq(schema.walletTransactions.wallet_id, wallet.id))
        .orderBy(desc(schema.walletTransactions.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.walletTransactions)
        .where(eq(schema.walletTransactions.wallet_id, wallet.id)),
    ]);

    return {
      message: "Wallet transactions retrieved",
      data: {
        wallet: {
          id: wallet.id,
          available_balance: wallet.available_balance,
          pending_balance: wallet.pending_balance,
          total_deposited: wallet.total_deposited,
        },
        transactions,
        pagination: {
          page,
          limit,
          total: Number(total),
        },
      },
    };
  }

  // === Stock & Inventory

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

  async fulfilStockRequest(requestId: number, _adminId: number) {
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

  // === Leads

  async getLeads() {
    const leads = await this.db
      .select()
      .from(schema.leads)
      .orderBy(desc(schema.leads.created_at));

    return { message: "Leads retrieved", data: leads };
  }

  // === Commissions

  /*
   * Joins the agent so a row is readable without a second lookup, and returns
   * `meta` in the shape the interceptor carries through, matching orders.
   */
  async getCommissions(params: {
    status?: "pending" | "confirmed" | "paid";
    type?:
      | "direct"
      | "buyer_referral"
      | "agent_override"
      | "state_manager_override";
    agentId?: number;
    page: number;
    limit: number;
    sort?: string;
    order?: string;
  }) {
    const conditions = [];
    if (params.status)
      conditions.push(eq(schema.commissions.status, params.status));
    if (params.type) conditions.push(eq(schema.commissions.type, params.type));
    if (params.agentId !== undefined)
      conditions.push(eq(schema.commissions.agent_id, params.agentId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const sorted = parseSort(
      params.sort,
      params.order,
      {
        created_at: schema.commissions.created_at,
        amount_kobo: schema.commissions.amount_kobo,
        status: schema.commissions.status,
        type: schema.commissions.type,
        paid_at: schema.commissions.paid_at,
        agent_name: schema.users.first_name,
      },
      "created_at",
    );
    const orderBy =
      sorted.direction === "asc" ? asc(sorted.column) : desc(sorted.column);

    const [rows, [totals]] = await Promise.all([
      this.db
        .select({
          id: schema.commissions.id,
          agent_id: schema.commissions.agent_id,
          agent_first_name: schema.users.first_name,
          agent_last_name: schema.users.last_name,
          agent_email: schema.users.email,
          order_id: schema.commissions.order_id,
          type: schema.commissions.type,
          amount_kobo: schema.commissions.amount_kobo,
          status: schema.commissions.status,
          paid_at: schema.commissions.paid_at,
          created_at: schema.commissions.created_at,
        })
        .from(schema.commissions)
        .leftJoin(
          schema.users,
          eq(schema.users.id, schema.commissions.agent_id),
        )
        .where(where)
        .orderBy(orderBy)
        .limit(params.limit)
        .offset(offset),
      /* Same WHERE as the rows, or the total contradicts the page. F19. */
      this.db.select({ total: count() }).from(schema.commissions).where(where),
    ]);

    const total = totals?.total ?? 0;

    return {
      message: "Commissions retrieved",
      data: rows,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        pages: Math.ceil(total / params.limit),
        sort: sorted.key,
        order: sorted.direction,
      },
    };
  }

  async markCommissionPaid(commissionId: number, adminId: number) {
    const [commission] = await this.db
      .select()
      .from(schema.commissions)
      .where(eq(schema.commissions.id, commissionId))
      .limit(1);

    if (!commission) throw new NotFoundException("Commission not found");
    if (commission.status === "paid") {
      throw new BadRequestException("That commission is already paid.");
    }

    const [updated] = await this.db
      .update(schema.commissions)
      .set({ status: "paid", paid_at: new Date() })
      .where(eq(schema.commissions.id, commissionId))
      .returning();

    await this.audit.record({
      admin_id: adminId,
      action: "commission.mark_paid",
      resource_type: "commission",
      resource_id: commissionId,
      details: { amount: updated.amount, agent_id: updated.agent_id },
    });

    return { message: "Commission marked as paid", data: updated };
  }

  // === Products

  async createProduct(dto: CreateProductDto) {
    if (dto.category_id) await this.assertCategoryExists(dto.category_id);

    /* Query builder rather than raw SQL: the previous INSERT named only 7
       columns, so the rest were validated and then silently dropped. */
    const category =
      dto.category ??
      (dto.category_id
        ? ((await this.taxonomy.rootCategoryName(dto.category_id)) ?? undefined)
        : undefined);

    const [product] = await this.db
      .insert(schema.productsTable)
      .values({
        name: dto.name,
        unit: dto.unit,
        price_kobo: dto.price_kobo,
        category_id: dto.category_id ?? null,
        ...(category !== undefined ? { category } : {}),
        measure_value: dto.measure_value ?? null,
        measure_unit: dto.measure_unit ?? null,
        weight_grams: dto.weight_grams ?? null,
        description: dto.description ?? null,
        image_url: dto.image_url ?? null,
        sort_order: dto.sort_order ?? 0,
        is_active: true,
      })
      .returning();

    return { message: "Product created", data: product };
  }

  async listProducts() {
    const rows = await this.db.execute(
      sql`SELECT * FROM product WHERE is_active = true ORDER BY sort_order, name`,
    );
    return { message: "Products retrieved", data: rows.rows || [] };
  }

  /* Without this the FK violation surfaces as a 500 rather than telling the
     caller which field was wrong. */
  private async assertCategoryExists(categoryId: number): Promise<void> {
    const [category] = await this.db
      .select({ id: schema.product_categories.id })
      .from(schema.product_categories)
      .where(eq(schema.product_categories.id, categoryId))
      .limit(1);

    if (!category) {
      throw new BadRequestException(
        `category_id ${categoryId} does not exist.`,
      );
    }
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    if (dto.category_id) await this.assertCategoryExists(dto.category_id);

    const updates: Partial<typeof schema.productsTable.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.price_kobo !== undefined) updates.price_kobo = dto.price_kobo;
    /* Same omission as createProduct: these were dropped on every edit. */
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.category_id !== undefined) {
      updates.category_id = dto.category_id;
      /* Re-derive the flat column unless this request set it explicitly. */
      if (dto.category === undefined) {
        const catName = dto.category_id
          ? await this.taxonomy.rootCategoryName(dto.category_id)
          : undefined;
        updates.category = catName ?? undefined;
      }
    }
    if (dto.measure_value !== undefined)
      updates.measure_value = dto.measure_value;
    if (dto.measure_unit !== undefined) updates.measure_unit = dto.measure_unit;
    if (dto.weight_grams !== undefined) updates.weight_grams = dto.weight_grams;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;
    if (dto.sort_order !== undefined) updates.sort_order = dto.sort_order;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException("No fields to update");
    }

    const [updated] = await this.db
      .update(schema.productsTable)
      .set(updates)
      .where(eq(schema.productsTable.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Product not found");

    return { message: "Product updated", data: updated };
  }

  async deleteProduct(id: number) {
    const [deleted] = await this.db
      .delete(schema.productsTable)
      .where(eq(schema.productsTable.id, id))
      .returning();

    if (!deleted) throw new NotFoundException("Product not found");

    return { message: "Product deleted", data: null };
  }

  async listActiveProducts() {
    const rows = await this.db
      .select()
      .from(schema.productsTable)
      .where(eq(schema.productsTable.is_active, true))
      .orderBy(schema.productsTable.sort_order, schema.productsTable.name);

    return { message: "Products retrieved", data: rows };
  }

  // === Outreach

  async createOutreachRecord(dto: {
    shop_name: string;
    owner_name?: string;
    phone?: string;
    lga?: string;
    address?: string;
    product_interest?: string;
    quantity?: number;
    notes?: string;
    collected_by?: string;
    visit_date: string;
  }) {
    const [record] = await this.db
      .insert(schema.outreach_records)
      .values(dto)
      .returning();
    return { message: "Outreach record saved", data: record };
  }

  async listOutreachRecords() {
    const rows = await this.db
      .select()
      .from(schema.outreach_records)
      .orderBy(desc(schema.outreach_records.created_at));
    return { message: "Outreach records retrieved", data: rows };
  }

  async deleteOutreachRecord(id: number) {
    const [deleted] = await this.db
      .delete(schema.outreach_records)
      .where(eq(schema.outreach_records.id, id))
      .returning();

    if (!deleted) throw new NotFoundException("Outreach record not found");

    return { message: "Record deleted", data: null };
  }

  // === Platform Settings (persisted in system_settings table)

  /*
   * Missing keys are materialised as real rows on first read rather than being
   * papered over with an inline fallback. The old version returned a default
   * that looked identical to a stored value, so the settings screen showed an
   * editable field whose value existed nowhere and silently changed the day
   * someone edited the constant. Self-healing, so no migration or re-seed.
   */
  async getSettings() {
    const stored = await this.settings.getAll();

    for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
      if (stored[key] === undefined) {
        await this.updateSetting(key, value);
        stored[key] = value;
      }
    }

    return {
      message: "Settings retrieved",
      data: {
        agent_commission_rate: await this.settings.getAgentCommissionPercent(),
        buyer_referral_discount_kobo: parseInt(
          stored["buyer_referral_discount_kobo"],
          10,
        ),
        buyer_referral_discount_type: stored["buyer_referral_discount_type"],
      },
    };
  }

  /*
   * Generate a referral code that is not already taken. The unique constraint
   * is the real guard; without a retry a collision surfaced as a raw database
   * error in the middle of approving an agent.
   */
  private async generateUniqueCode(
    prefix: string,
    column:
      | typeof schema.agent_profiles.referral_buyer_code
      | typeof schema.agent_profiles.referral_agent_code,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${prefix}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

      const [taken] = await this.db
        .select({ user_id: schema.agent_profiles.user_id })
        .from(schema.agent_profiles)
        .where(eq(column, candidate))
        .limit(1);

      if (!taken) return candidate;
    }

    throw new BadRequestException(
      "Could not generate a unique referral code. Please try again.",
    );
  }

  private async issueReferralCodes(agentId: number): Promise<void> {
    const [existing] = await this.db
      .select({
        buyer: schema.agent_profiles.referral_buyer_code,
        agent: schema.agent_profiles.referral_agent_code,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, agentId))
      .limit(1);

    if (existing?.buyer && existing?.agent) return;

    const buyerCode =
      existing?.buyer ??
      (await this.generateUniqueCode(
        "BUYER",
        schema.agent_profiles.referral_buyer_code,
      ));
    const agentCode =
      existing?.agent ??
      (await this.generateUniqueCode(
        "AGENT",
        schema.agent_profiles.referral_agent_code,
      ));

    await this.db
      .update(schema.agent_profiles)
      .set({ referral_buyer_code: buyerCode, referral_agent_code: agentCode })
      .where(eq(schema.agent_profiles.user_id, agentId));
  }

  async updateSetting(key: string, value: string, adminId?: number) {
    const allowed = [
      "agent_commission_rate",
      "buyer_referral_discount_kobo",
      "buyer_referral_discount_type",
      "agent_override_rate_percent",
      "state_manager_override_rate_percent",
    ];
    if (!allowed.includes(key))
      throw new BadRequestException(`Unknown setting key: ${key}`);

    const percentKeys = [
      "agent_commission_rate",
      "agent_override_rate_percent",
      "state_manager_override_rate_percent",
    ];
    if (percentKeys.includes(key)) {
      const n = parseFloat(value);
      if (isNaN(n) || n < 1 || n > 100)
        throw new BadRequestException(
          `${key} must be a number between 1 and 100`,
        );
    }

    /* Unvalidated before, so a typo here was stored and only surfaced later as
       NaN in the settings response. */
    if (key === "buyer_referral_discount_kobo") {
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0)
        throw new BadRequestException(
          "Referral discount must be a whole number of kobo, zero or more",
        );
    }

    if (key === "buyer_referral_discount_type") {
      if (!["flat", "percent"].includes(value))
        throw new BadRequestException(
          'Referral discount type must be "flat" or "percent"',
        );
    }

    /*
     * Read the current value before overwriting it. `details` is a jsonb column
     * documented as holding before/after values, and it was not being populated
     * for settings, so a bad change was traceable but not revertable: nobody
     * knew what to put back.
     */
    const previous = await this.settings.get(key);

    await this.db
      .insert(schema.system_settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: schema.system_settings.key,
        set: { value, updated_at: new Date() },
      });

    /* Drop the cached read so the change is live immediately, not in 30s. */
    this.settings.invalidate(key);

    /*
     * adminId is optional here because getSettings materialises defaults through
     * this same method with no acting admin. A null actor is honest; inventing
     * one would put a person's name against a write they did not make.
     */
    await this.audit.record({
      admin_id: adminId ?? null,
      action: "setting.update",
      resource_type: "system_setting",
      details: { key, before: previous, after: value },
    });

    return { message: "Setting updated", data: { key, value } };
  }

  // === Withdrawals

  /*
   * The approval step that was missing entirely.
   *
   * `POST /payment/payout/:id` and the weekly cron both require a withdrawal to
   * be "approved", but nothing could move a row off "pending": agents could
   * request payouts into a queue that had no exit. These three methods are that
   * exit.
   */

  async getWithdrawals(
    filters: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    } = {},
  ) {
    const { status, search, page = 1, limit = 50, sort, order } = filters;
    const offset = (page - 1) * limit;

    const agent = schema.users;

    /* The endpoint's own sortable surface. Add a key here, not a branch. */
    const sorted = parseSort(
      sort,
      order,
      {
        id: schema.withdrawals.id,
        created_at: schema.withdrawals.created_at,
        amount: schema.withdrawals.amount,
        status: schema.withdrawals.status,
        agent_name: agent.first_name,
        processed_at: schema.withdrawals.processed_at,
      },
      "created_at",
    );
    const orderBy =
      sorted.direction === "asc" ? asc(sorted.column) : desc(sorted.column);

    const term = search ? `%${search.toLowerCase()}%` : undefined;

    /* Shared with the count query below, which otherwise totals every row. */
    const whereClause = and(
      status
        ? eq(
            schema.withdrawals.status,
            status as "pending" | "approved" | "rejected" | "paid",
          )
        : undefined,
      term
        ? sql`(lower(${agent.first_name}) || ' ' || lower(${agent.last_name}) like ${term} or lower(${agent.email}) like ${term} or lower(${schema.withdrawals.bank_account_name}) like ${term} or ${schema.withdrawals.bank_account_number} like ${term} or lower(${schema.withdrawals.payout_reference}) like ${term})`
        : undefined,
    );

    const rows = await this.db
      .select({
        id: schema.withdrawals.id,
        agent_id: schema.withdrawals.agent_id,
        agent_first_name: agent.first_name,
        agent_last_name: agent.last_name,
        agent_email: agent.email,
        amount: schema.withdrawals.amount,
        bank_name: schema.withdrawals.bank_name,
        bank_account_number: schema.withdrawals.bank_account_number,
        bank_account_name: schema.withdrawals.bank_account_name,
        status: schema.withdrawals.status,
        rejection_reason: schema.withdrawals.rejection_reason,
        payout_reference: schema.withdrawals.payout_reference,
        processed_at: schema.withdrawals.processed_at,
        /* The point of F20: stamping the actor is useless if the list that an
           admin actually reads does not project it. */
        processed_by: schema.withdrawals.processed_by,
        created_at: schema.withdrawals.created_at,
      })
      .from(schema.withdrawals)
      .leftJoin(agent, eq(agent.id, schema.withdrawals.agent_id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(schema.withdrawals)
      .leftJoin(agent, eq(agent.id, schema.withdrawals.agent_id))
      .where(whereClause);

    /*
     * Deliberately unfiltered. The admin page labels these "awaiting review"
     * and "approved, due Friday", which are claims about the whole queue - a
     * sum of the visible page would only ever be a sum of ten rows.
     */
    const queueTotals = await this.db
      .select({
        status: schema.withdrawals.status,
        amount: sum(schema.withdrawals.amount),
      })
      .from(schema.withdrawals)
      .where(inArray(schema.withdrawals.status, ["pending", "approved"]))
      .groupBy(schema.withdrawals.status);

    const sumFor = (want: string): number =>
      Number(queueTotals.find((r) => r.status === want)?.amount ?? 0);

    return {
      message: "Withdrawals retrieved",
      data: rows,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        sort: sorted.key,
        order: sorted.direction,
        pending_total: sumFor("pending"),
        approved_total: sumFor("approved"),
      },
    };
  }

  async approveWithdrawal(id: number, adminId: number) {
    const [withdrawal] = await this.db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.id, id))
      .limit(1);

    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    if (withdrawal.status !== "pending") {
      throw new BadRequestException(
        `Only pending payouts can be approved; this one is ${withdrawal.status}.`,
      );
    }

    /*
     * Approval only marks it payable. The transfer itself is left to the Friday
     * sweep or an explicit payout call, so approving can never move money as a
     * side effect of a misclick.
     */
    const [updated] = await this.db
      .update(schema.withdrawals)
      .set({
        status: "approved",
        processed_at: new Date(),
        processed_by: adminId,
      })
      .where(
        and(
          eq(schema.withdrawals.id, id),
          eq(schema.withdrawals.status, "pending"),
        ),
      )
      .returning();

    if (!updated) {
      throw new BadRequestException("That payout was just changed elsewhere.");
    }

    await this.audit.record({
      admin_id: adminId,
      action: "withdrawal.approve",
      resource_type: "withdrawal",
      resource_id: id,
      details: { amount: updated.amount, agent_id: updated.agent_id },
    });

    return { message: "Payout approved", data: updated };
  }

  async rejectWithdrawal(id: number, adminId: number, reason?: string) {
    const [withdrawal] = await this.db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.id, id))
      .limit(1);

    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    if (withdrawal.status !== "pending" && withdrawal.status !== "approved") {
      throw new BadRequestException(
        `A ${withdrawal.status} payout cannot be rejected.`,
      );
    }

    const [updated] = await this.db
      .update(schema.withdrawals)
      .set({
        status: "rejected",
        rejection_reason: reason ?? null,
        processed_at: new Date(),
        processed_by: adminId,
      })
      /* Guards on status to match the precondition above; guarding on
         processed_at broke approve-then-reject once approve started setting it. */
      .where(
        and(
          eq(schema.withdrawals.id, id),
          inArray(schema.withdrawals.status, ["pending", "approved"]),
        ),
      )
      .returning();

    if (!updated) {
      throw new BadRequestException("That payout was just changed elsewhere.");
    }

    /*
     * The request debited available balance up front so the same money could not
     * be requested twice. A rejection means it was never sent, so it has to go
     * back or the agent quietly loses it.
     */
    await this.wallet.refundAvailable(withdrawal.agent_id, withdrawal.amount);

    await this.audit.record({
      admin_id: adminId,
      action: "withdrawal.reject",
      resource_type: "withdrawal",
      resource_id: id,
      details: { amount: updated.amount, agent_id: updated.agent_id, reason },
    });

    return { message: "Payout rejected and balance returned", data: updated };
  }

  async changePassword(
    dto: { current_password: string; new_password: string },
    adminId: number,
  ) {
    const [admin] = await this.db
      .select({ id: schema.users.id, password: schema.users.password })
      .from(schema.users)
      .where(eq(schema.users.id, adminId))
      .limit(1);

    if (!admin) throw new NotFoundException("Admin not found");
    if (!admin.password)
      throw new BadRequestException("No password set on this account");

    const valid = await bcrypt.compare(dto.current_password, admin.password);
    if (!valid) throw new BadRequestException("Current password is incorrect");

    if (dto.current_password === dto.new_password) {
      throw new BadRequestException(
        "New password must be different from current password",
      );
    }

    const hashed = await bcrypt.hash(dto.new_password, 12);
    /* Clearing the flag here is what retires the dashboard reminder. It is set
       in the same write as the password so the two can never disagree. */
    await this.db
      .update(schema.users)
      .set({
        password: hashed,
        must_change_password: false,
        password_changed_at: new Date(),
      })
      .where(eq(schema.users.id, adminId));

    return { message: "Password changed successfully", data: null };
  }
}
