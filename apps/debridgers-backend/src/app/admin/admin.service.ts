import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, count, sum, and, ilike, sql } from "drizzle-orm";
import * as crypto from "crypto";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { PromoteManagerDto } from "./dto/promote-manager.dto";
import { ReviewKycDto } from "./dto/review-kyc.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  async getAdminMe(userId: number) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return { message: "Admin profile retrieved", data: user ?? null };
  }

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
      // Auto-verify email on approval — admin has vetted the agent
      await this.db
        .update(schema.users)
        .set({ is_email_verified: true })
        .where(eq(schema.users.id, agentId));

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

  // ─── Orders ──────────────────────────────────────────────────────────────────

  async getAllOrders(
    filters: {
      status?: string;
      payment_status?: string;
      search?: string; // buyer name or email
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, payment_status, search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const buyer = schema.users;
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
      .where(
        and(
          status
            ? eq(
                schema.orders.status,
                status as typeof schema.orders.status._.data,
              )
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
        ),
      )
      .orderBy(desc(schema.orders.created_at))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(schema.orders);

    return {
      message: "Orders retrieved",
      data: rows,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
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

  // ─── Products ────────────────────────────────────────────────────────────────

  async createProduct(dto: CreateProductDto) {
    const [product] = await this.db
      .insert(schema.products)
      .values({
        name: dto.name,
        unit: dto.unit,
        price_kobo: dto.price_kobo,
        description: dto.description ?? null,
        image_url: dto.image_url ?? null,
        sort_order: dto.sort_order ?? 0,
      })
      .returning();

    return { message: "Product created", data: product };
  }

  async listProducts() {
    const rows = await this.db
      .select()
      .from(schema.products)
      .orderBy(schema.products.sort_order, schema.products.name);

    return { message: "Products retrieved", data: rows };
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    const updates: Partial<typeof schema.products.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.price_kobo !== undefined) updates.price_kobo = dto.price_kobo;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;
    if (dto.sort_order !== undefined) updates.sort_order = dto.sort_order;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException("No fields to update");
    }

    const [updated] = await this.db
      .update(schema.products)
      .set(updates)
      .where(eq(schema.products.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Product not found");

    return { message: "Product updated", data: updated };
  }

  async deleteProduct(id: number) {
    const [deleted] = await this.db
      .delete(schema.products)
      .where(eq(schema.products.id, id))
      .returning();

    if (!deleted) throw new NotFoundException("Product not found");

    return { message: "Product deleted", data: null };
  }

  async listActiveProducts() {
    const rows = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.is_active, true))
      .orderBy(schema.products.sort_order, schema.products.name);

    return { message: "Products retrieved", data: rows };
  }

  // ─── Outreach ────────────────────────────────────────────────────────────────

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
    await this.db
      .delete(schema.outreach_records)
      .where(eq(schema.outreach_records.id, id));
    return { message: "Record deleted", data: null };
  }

  // ─── Platform Settings (persisted in system_settings table) ─────────────────

  async getSettings() {
    const rows = await this.db.select().from(schema.system_settings);

    const stored: Record<string, string> = {};
    for (const row of rows) stored[row.key] = row.value;

    const envRate =
      parseFloat(
        this.config.get<string>("PaystackConfig.commissionRate") ?? "0.30",
      ) * 100;

    return {
      message: "Settings retrieved",
      data: {
        agent_commission_rate: stored["agent_commission_rate"]
          ? parseFloat(stored["agent_commission_rate"])
          : envRate,
        buyer_referral_discount_kobo: parseInt(
          stored["buyer_referral_discount_kobo"] ?? "50000",
          10,
        ),
        buyer_referral_discount_type:
          stored["buyer_referral_discount_type"] ?? "flat",
      },
    };
  }

  async updateSetting(key: string, value: string) {
    const allowed = [
      "agent_commission_rate",
      "buyer_referral_discount_kobo",
      "buyer_referral_discount_type",
    ];
    if (!allowed.includes(key))
      throw new BadRequestException(`Unknown setting key: ${key}`);

    if (key === "agent_commission_rate") {
      const n = parseFloat(value);
      if (isNaN(n) || n < 1 || n > 100)
        throw new BadRequestException(
          "Commission rate must be a number between 1 and 100",
        );
    }

    await this.db
      .insert(schema.system_settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: schema.system_settings.key,
        set: { value, updated_at: new Date() },
      });

    return { message: "Setting updated", data: { key, value } };
  }
}
