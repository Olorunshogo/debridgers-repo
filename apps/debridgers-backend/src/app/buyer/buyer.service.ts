import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, sum, count, and, inArray, sql } from "drizzle-orm";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { JwtPayload } from "../../interfaces/users/jwt.type";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class BuyerService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getProfile(user: JwtPayload) {
    const [buyer] = await this.db
      .select({
        id: schema.users.id,
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        is_email_verified: schema.users.is_email_verified,
        zone_id: schema.users.zone_id,
        delivery_address: schema.users.delivery_address,
        avatar_url: schema.users.avatar_url,
        email_notifications: schema.users.email_notifications,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    return { message: "Profile retrieved", data: buyer };
  }

  async updateProfile(dto: UpdateProfileDto, user: JwtPayload) {
    const updates: Partial<typeof schema.users.$inferInsert> = {};
    if (dto.first_name !== undefined) updates.first_name = dto.first_name;
    if (dto.last_name !== undefined) updates.last_name = dto.last_name;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.delivery_address !== undefined)
      updates.delivery_address = dto.delivery_address;
    if (dto.email_notifications !== undefined)
      updates.email_notifications = dto.email_notifications;

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(schema.users)
        .set(updates)
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

  async getNotifications(user: JwtPayload) {
    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.user_id, user.sub))
      .orderBy(desc(schema.notifications.created_at));

    return {
      message: "Notifications retrieved",
      data: rows.map((n) => ({
        id: String(n.id),
        title: n.title,
        description: n.description,
        timestamp: n.created_at?.toISOString() ?? new Date().toISOString(),
        read: n.read,
      })),
    };
  }

  async markNotificationRead(notifId: number, user: JwtPayload) {
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, notifId),
          eq(schema.notifications.user_id, user.sub),
        ),
      );
    return { message: "Notification marked as read", data: null };
  }

  async createOrder(dto: CreateOrderDto, user: JwtPayload) {
    const [buyer] = await this.db
      .select({ zone_id: schema.users.zone_id })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    let zoneId = buyer.zone_id;

    if (!zoneId) {
      // Fall back to the first active zone
      const [defaultZone] = await this.db
        .select({ id: schema.zones.id })
        .from(schema.zones)
        .where(eq(schema.zones.is_active, true))
        .limit(1);

      if (!defaultZone)
        throw new BadRequestException("No delivery zone available");
      zoneId = defaultZone.id;
    }

    const [zone] = await this.db
      .select({ delivery_fee: schema.zones.delivery_fee })
      .from(schema.zones)
      .where(eq(schema.zones.id, zoneId))
      .limit(1);

    const deliveryFee = zone?.delivery_fee ?? 0;
    const handlingFee = 10000; // ₦100 in kobo

    const [order] = await this.db
      .insert(schema.orders)
      .values({
        buyer_id: user.sub,
        zone_id: zoneId,
        quantity: dto.quantity,
        unit_price: Math.round(dto.total_amount_kobo / dto.quantity),
        handling_fee: handlingFee,
        delivery_fee: deliveryFee,
        total_amount: dto.total_amount_kobo,
        order_mode: "referral",
        status: "pending",
        delivery_address: dto.delivery_address,
        notes: dto.notes ?? null,
      })
      .returning();

    return { message: "Order placed successfully", data: order };
  }

  async getOrders(user: JwtPayload) {
    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, user.sub))
      .orderBy(desc(schema.orders.created_at));

    return { message: "Orders retrieved", data: orders };
  }

  async getDashboard(user: JwtPayload) {
    const [buyer] = await this.db
      .select({
        first_name: schema.users.first_name,
        last_name: schema.users.last_name,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    const [totalOrdersRow] = await this.db
      .select({ total: count() })
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, user.sub));

    const activeStatuses = [
      "pending",
      "confirmed",
      "out_for_delivery",
    ] as const;
    const [activeOrdersRow] = await this.db
      .select({ total: count() })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          inArray(schema.orders.status, activeStatuses),
        ),
      );

    const [totalSpentRow] = await this.db
      .select({ total: sum(schema.orders.total_amount) })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          eq(schema.orders.status, "delivered"),
        ),
      );

    const recentOrders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, user.sub))
      .orderBy(desc(schema.orders.created_at))
      .limit(5);

    const [nextDelivery] = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          inArray(schema.orders.status, ["confirmed", "out_for_delivery"]),
        ),
      )
      .orderBy(desc(schema.orders.created_at))
      .limit(1);

    const now = new Date();
    const hour = now.getHours();
    const greeting =
      hour < 12
        ? "Good Morning"
        : hour < 17
          ? "Good Afternoon"
          : "Good Evening";

    const totalSpentKobo = Number(totalSpentRow?.total ?? 0);

    return {
      message: "Dashboard retrieved",
      data: {
        user_name: `${buyer.first_name} ${buyer.last_name}`.trim(),
        greeting,
        stats: {
          total_orders: totalOrdersRow?.total ?? 0,
          active_orders: activeOrdersRow?.total ?? 0,
          total_spent_kobo: totalSpentKobo,
          total_spent_naira: totalSpentKobo / 100,
        },
        recent_orders: recentOrders,
        next_delivery: nextDelivery ?? null,
        // Spending chart data is not tracked per week in the DB yet.
        // Frontend should show real stats from recent_orders for now.
        spending_chart: [] as { week: string; amount_kobo: number }[],
      },
    };
  }

  async getProducts() {
    const rows = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.is_active, true))
      .orderBy(schema.products.sort_order, schema.products.name);

    return { message: "Products retrieved", data: rows };
  }

  async getWeeklySpending(user: JwtPayload) {
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

    const rows = await this.db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${schema.orders.created_at}), 'Mon DD')`,
        amount: sum(schema.orders.total_amount),
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          eq(schema.orders.status, "delivered"),
          sql`${schema.orders.created_at} >= ${sixWeeksAgo.toISOString()}`,
        ),
      )
      .groupBy(sql`date_trunc('week', ${schema.orders.created_at})`)
      .orderBy(sql`date_trunc('week', ${schema.orders.created_at})`);

    return {
      message: "Weekly spending retrieved",
      data: rows.map((r) => ({
        week: r.week,
        amount_kobo: Number(r.amount ?? 0),
        amount_naira: Number(r.amount ?? 0) / 100,
      })),
    };
  }

  async changePassword(
    dto: { old_password: string; new_password: string },
    user: JwtPayload,
  ) {
    const [buyer] = await this.db
      .select({ id: schema.users.id, password: schema.users.password })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");
    if (!buyer.password)
      throw new BadRequestException("No password set on this account");

    const valid = await bcrypt.compare(dto.old_password, buyer.password);
    if (!valid)
      throw new UnauthorizedException("Current password is incorrect");

    if (dto.new_password.length < 8)
      throw new BadRequestException(
        "New password must be at least 8 characters",
      );

    const hashed = await bcrypt.hash(dto.new_password, 12);
    await this.db
      .update(schema.users)
      .set({ password: hashed })
      .where(eq(schema.users.id, user.sub));

    return { message: "Password updated successfully", data: null };
  }
}
