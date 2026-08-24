import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";

@Injectable()
export class BuyerAdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async listBuyers(filters: {
    search?: string;
    status?: "active" | "suspended";
    sort?: "recent" | "high_deposit" | "most_orders";
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Get all buyers
    const buyers = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "buyer"));

    // Filter in memory
    let filtered = buyers;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          `${b.first_name} ${b.last_name}`
            .toLowerCase()
            .includes(searchLower) ||
          b.email?.toLowerCase().includes(searchLower),
      );
    }

    if (filters.status === "suspended") {
      filtered = filtered.filter((b) => b.is_suspended === true);
    } else if (filters.status === "active") {
      filtered = filtered.filter((b) => b.is_suspended === false);
    }

    // Sort in memory
    if (filters.sort === "high_deposit") {
      filtered.sort(
        (a, b) => (b.total_deposited ?? 0) - (a.total_deposited ?? 0),
      );
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at ?? new Date()).getTime() -
          new Date(a.created_at ?? new Date()).getTime(),
      );
    }

    // Paginate
    const paged = filtered.slice(offset, offset + limit);

    return {
      buyers: paged.map((b) => ({
        id: b.id,
        name: `${b.first_name} ${b.last_name}`,
        email: b.email,
        phone: b.phone,
        status: b.is_suspended ? "suspended" : "active",
        total_deposited: b.total_deposited,
        joined_at: b.created_at,
      })),
      total: filtered.length,
      page,
      limit,
    };
  }

  async getBuyerProfile(buyerId: number) {
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")));

    if (!buyer) {
      throw new NotFoundException("Buyer not found");
    }

    // Get wallet info
    const [wallet] = await this.db
      .select()
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, buyerId));

    // Get all orders
    const orders = await this.db
      .select({
        id: schema.orders.id,
        order_reference: schema.orders.order_reference,
        status: schema.orders.status,
        payment_status: schema.orders.payment_status,
        total_amount: schema.orders.total_amount,
        created_at: schema.orders.created_at,
        delivery_verified_at: schema.orders.delivery_verified_at,
      })
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, buyerId))
      .orderBy(desc(schema.orders.created_at));

    return {
      id: buyer.id,
      name: `${buyer.first_name} ${buyer.last_name}`,
      email: buyer.email,
      phone: buyer.phone,
      delivery_address: buyer.delivery_address,
      status: buyer.is_suspended ? "suspended" : "active",
      is_suspended: buyer.is_suspended,
      suspended_at: buyer.suspended_at,
      suspended_reason: buyer.suspended_reason,
      wallet: {
        balance: wallet?.available_balance || 0,
        total_deposited: buyer.total_deposited,
      },
      orders: orders.map((o) => ({
        id: o.id,
        order_reference: o.order_reference,
        status: o.status,
        payment_status: o.payment_status,
        amount: o.total_amount,
        created_at: o.created_at,
        delivery_verified: !!o.delivery_verified_at,
      })),
      joined_at: buyer.created_at,
    };
  }

  async suspendBuyer(buyerId: number, reason: string, adminId: number) {
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")));

    if (!buyer) {
      throw new NotFoundException("Buyer not found");
    }

    if (buyer.is_suspended) {
      throw new BadRequestException("Buyer is already suspended");
    }

    // Update buyer
    await this.db
      .update(schema.users)
      .set({
        is_suspended: true,
        suspended_at: new Date(),
        suspended_reason: reason,
      })
      .where(eq(schema.users.id, buyerId));

    // Log action
    await this.db.insert(schema.buyerAdminLogs).values({
      admin_id: adminId,
      buyer_id: buyerId,
      action: "suspend",
      details: { reason },
    });

    return { buyer_id: buyerId, status: "suspended" };
  }

  async unsuspendBuyer(buyerId: number, adminId: number) {
    const [buyer] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, buyerId), eq(schema.users.role, "buyer")));

    if (!buyer) {
      throw new NotFoundException("Buyer not found");
    }

    if (!buyer.is_suspended) {
      throw new BadRequestException("Buyer is not suspended");
    }

    // Update buyer
    await this.db
      .update(schema.users)
      .set({
        is_suspended: false,
        suspended_at: null,
        suspended_reason: null,
      })
      .where(eq(schema.users.id, buyerId));

    // Log action
    await this.db.insert(schema.buyerAdminLogs).values({
      admin_id: adminId,
      buyer_id: buyerId,
      action: "unsuspend",
      details: null,
    });

    return { buyer_id: buyerId, status: "active" };
  }
}
