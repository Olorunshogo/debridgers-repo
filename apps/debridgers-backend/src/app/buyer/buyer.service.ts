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
import { SyncCartDto } from "./dto/sync-cart.dto";
import { InitializeOrderPaymentDto } from "./dto/initialize-order-payment.dto";
import { QuoteCartDto } from "./dto/quote-cart.dto";
import { computeDeliveryFee, computeOrderTotals } from "./delivery-fee";
import { PaymentService } from "../payment/payment.service";
import { ConfigService } from "@nestjs/config";
import { SystemSettingsService } from "../settings/system-settings.service";

@Injectable()
export class BuyerService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly payment: PaymentService,
    private readonly config: ConfigService,
    private readonly settings: SystemSettingsService,
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

  // === Cart

  /*
   * The buyer's server-side cart, joined to products so the client gets
   * everything a cart line needs to render without a second request.
   * Inactive or deleted products are filtered out rather than returned as
   * broken lines.
   */
  async getCart(user: JwtPayload) {
    const items = await this.db
      .select({
        product_id: schema.cart_items.product_id,
        quantity: schema.cart_items.quantity,
        name: schema.products.name,
        unit: schema.products.unit,
        price_kobo: schema.products.price_kobo,
        image_url: schema.products.image_url,
      })
      .from(schema.cart_items)
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.cart_items.product_id),
      )
      .where(
        and(
          eq(schema.cart_items.user_id, user.sub),
          eq(schema.products.is_active, true),
        ),
      );

    return { message: "Cart retrieved", data: items };
  }

  /*
   * Full replace. See sync-cart.dto.ts for why this is not a delta API.
   * Runs in a transaction so a failed write can never leave a half-synced cart.
   */
  async replaceCart(dto: SyncCartDto, user: JwtPayload) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.cart_items)
        .where(eq(schema.cart_items.user_id, user.sub));

      if (dto.items.length > 0) {
        await tx.insert(schema.cart_items).values(
          dto.items.map((item) => ({
            user_id: user.sub,
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        );
      }
    });

    return { message: "Cart synced", data: null };
  }

  /*
   * Merges a local cart into the stored one, taking the HIGHER quantity per
   * product rather than the sum - see the note in sync-cart.dto.ts. Called once
   * on login, when a device's offline cart first meets the account's.
   */
  async mergeCart(dto: SyncCartDto, user: JwtPayload) {
    const existing = await this.db
      .select({
        product_id: schema.cart_items.product_id,
        quantity: schema.cart_items.quantity,
      })
      .from(schema.cart_items)
      .where(eq(schema.cart_items.user_id, user.sub));

    const merged = new Map<number, number>();
    for (const row of existing) merged.set(row.product_id, row.quantity);
    for (const item of dto.items) {
      const current = merged.get(item.product_id) ?? 0;
      merged.set(item.product_id, Math.max(current, item.quantity));
    }

    await this.replaceCart(
      {
        items: Array.from(merged, ([product_id, quantity]) => ({
          product_id,
          quantity,
        })),
      },
      user,
    );

    return this.getCart(user);
  }

  async clearCart(user: JwtPayload) {
    await this.db
      .delete(schema.cart_items)
      .where(eq(schema.cart_items.user_id, user.sub));

    return { message: "Cart cleared", data: null };
  }

  // === Favorites

  async getFavorites(user: JwtPayload) {
    const items = await this.db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        unit: schema.products.unit,
        price_kobo: schema.products.price_kobo,
        description: schema.products.description,
        image_url: schema.products.image_url,
      })
      .from(schema.favorites)
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.favorites.product_id),
      )
      .where(
        and(
          eq(schema.favorites.user_id, user.sub),
          eq(schema.products.is_active, true),
        ),
      )
      .orderBy(desc(schema.favorites.created_at));

    return { message: "Favorites retrieved", data: items };
  }

  /* Idempotent: favouriting twice is a no-op, not an error or a second row. */
  async addFavorite(productId: number, user: JwtPayload) {
    const [product] = await this.db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .limit(1);

    if (!product) throw new NotFoundException("Product not found");

    await this.db
      .insert(schema.favorites)
      .values({ user_id: user.sub, product_id: productId })
      .onConflictDoNothing();

    return { message: "Added to favorites", data: null };
  }

  async removeFavorite(productId: number, user: JwtPayload) {
    await this.db
      .delete(schema.favorites)
      .where(
        and(
          eq(schema.favorites.user_id, user.sub),
          eq(schema.favorites.product_id, productId),
        ),
      );

    return { message: "Removed from favorites", data: null };
  }

  // === Buy again

  /*
   * Derived from order history rather than stored: ranked by how often the
   * buyer has ordered each product, then by recency. Deliberately distinct from
   * favourites - this is observed behaviour, a favourite is a stated intention.
   */
  async getBuyAgain(user: JwtPayload, limit = 8) {
    const rows = await this.db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        unit: schema.products.unit,
        price_kobo: schema.products.price_kobo,
        description: schema.products.description,
        image_url: schema.products.image_url,
        times_ordered: count(schema.order_items.id),
      })
      .from(schema.order_items)
      .innerJoin(
        schema.orders,
        eq(schema.orders.id, schema.order_items.order_id),
      )
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.order_items.product_id),
      )
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          eq(schema.products.is_active, true),
        ),
      )
      .groupBy(
        schema.products.id,
        schema.products.name,
        schema.products.unit,
        schema.products.price_kobo,
        schema.products.description,
        schema.products.image_url,
      )
      .orderBy(
        desc(count(schema.order_items.id)),
        desc(sql`max(${schema.orders.created_at})`),
      )
      .limit(limit);

    return { message: "Buy again retrieved", data: rows };
  }

  /*
   * Free-delivery promotion window. Stored as an ISO timestamp under
   * `free_delivery_until` in system_settings so it can be switched on from the
   * admin UI without a deploy. Absent or past means normal pricing.
   */
  private async isFreeDeliveryActive(): Promise<boolean> {
    const value = await this.settings.get("free_delivery_until");

    if (!value) return false;
    const until = new Date(value);
    return !Number.isNaN(until.getTime()) && until.getTime() > Date.now();
  }

  /*
   * Prices a basket: re-reads every product from the database, resolves the
   * delivery zone, and returns the full breakdown.
   *
   * Both the quote endpoint and checkout call this, so what the buyer is shown
   * and what they are charged cannot drift apart.
   */
  private async priceBasket(
    lines: readonly { product_id: number; qty: number }[],
    zoneId: number,
  ) {
    const productIds = lines.map((line) => line.product_id);
    const catalogue = await this.db
      .select({
        id: schema.products.id,
        price_kobo: schema.products.price_kobo,
      })
      .from(schema.products)
      .where(
        and(
          inArray(schema.products.id, productIds),
          eq(schema.products.is_active, true),
        ),
      );

    const byId = new Map(catalogue.map((row) => [row.id, row]));
    const missing = productIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `These products are no longer available: ${missing.join(", ")}`,
      );
    }

    const priced = lines.map((line) => {
      const product = byId.get(line.product_id) as {
        id: number;
        price_kobo: number;
      };
      return {
        product_id: line.product_id,
        quantity: line.qty,
        unit_price_kobo: product.price_kobo,
      };
    });

    const itemsTotalKobo = priced.reduce(
      (sum, line) => sum + line.unit_price_kobo * line.quantity,
      0,
    );
    /* One package per unit ordered - two bags of rice is two slots. */
    const packageCount = priced.reduce((sum, line) => sum + line.quantity, 0);

    const [zone] = await this.db
      .select({
        delivery_fee: schema.zones.delivery_fee,
        free_delivery: schema.zones.free_delivery,
      })
      .from(schema.zones)
      .where(eq(schema.zones.id, zoneId))
      .limit(1);

    /*
     * Free either because this zone is standing policy, or because a global
     * time-boxed promo is running. Zone-level wins independently of the promo
     * window, so a permanently-free area does not start charging when the
     * campaign ends.
     */
    const freeDelivery =
      Boolean(zone?.free_delivery) || (await this.isFreeDeliveryActive());

    const fee = computeDeliveryFee({
      zoneFeeKobo: zone?.delivery_fee ?? 0,
      packageCount,
      freeDelivery,
    });

    return {
      lines: priced,
      totals: computeOrderTotals(itemsTotalKobo, fee),
      packageCount,
    };
  }

  /*
   * Resolves the zone an order will be delivered to. Prefers the zone the buyer
   * picked at checkout over the one on their profile - people order to
   * addresses that are not their own.
   *
   * Deliberately throws rather than falling back to "the first active zone",
   * which the original createOrder did: guessing a zone means guessing a
   * delivery fee, and an unserviceable address should say so.
   */
  private async resolveDeliveryZone(
    user: JwtPayload,
    requestedZoneId?: number,
  ): Promise<number> {
    if (requestedZoneId) {
      const [zone] = await this.db
        .select({ id: schema.zones.id })
        .from(schema.zones)
        .where(
          and(
            eq(schema.zones.id, requestedZoneId),
            eq(schema.zones.is_active, true),
          ),
        )
        .limit(1);
      if (!zone) {
        throw new BadRequestException(
          "We do not deliver to that area yet. Please choose another.",
        );
      }
      return zone.id;
    }

    const [buyer] = await this.db
      .select({ zone_id: schema.users.zone_id })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer?.zone_id) {
      throw new BadRequestException(
        "Please choose a delivery area before checking out.",
      );
    }
    return buyer.zone_id;
  }

  /** Live pricing for the cart summary, so the buyer sees fees before paying. */
  async quoteCart(dto: QuoteCartDto, user: JwtPayload) {
    const zoneId = await this.resolveDeliveryZone(user, dto.zone_id);
    const { totals, packageCount } = await this.priceBasket(dto.cart, zoneId);

    return {
      message: "Quote generated",
      data: { ...totals, zone_id: zoneId, package_count: packageCount },
    };
  }

  // === Checkout

  /*
   * Creates a pending order with its line items and hands back a Paystack
   * checkout URL. The order exists before payment so the webhook has something
   * to confirm; it stays `pending`/`unpaid` until charge.success arrives.
   */
  async initializeOrderPayment(
    dto: InitializeOrderPaymentDto,
    user: JwtPayload,
  ) {
    const [buyer] = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer) throw new NotFoundException("Buyer not found");

    const zoneId = await this.resolveDeliveryZone(user, dto.zone_id);
    /* Same pricing path as the quote, so what was shown is what is charged. */
    const { lines, totals } = await this.priceBasket(dto.cart, zoneId);
    const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

    const order = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.orders)
        .values({
          buyer_id: user.sub,
          zone_id: zoneId,
          quantity: totalQuantity,
          /* Legacy single-product columns; order_items is the real record. */
          unit_price: Math.round(totals.itemsTotalKobo / totalQuantity),
          handling_fee: totals.handlingFeeKobo,
          delivery_fee: totals.deliveryFeeKobo,
          total_amount: totals.totalKobo,
          order_mode: "referral",
          status: "pending",
          payment_status: "unpaid",
          delivery_address: dto.delivery_address,
          notes: dto.notes ?? null,
        })
        .returning();

      await tx.insert(schema.order_items).values(
        lines.map((line) => ({
          order_id: created.id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price_kobo: line.unit_price_kobo,
        })),
      );

      return created;
    });

    /*
     * TODO(payments): remove this branch once real Paystack credentials exist.
     *
     * Simulation mode. With PAYMENTS_SIMULATED=true the gateway call is skipped,
     * the order is marked paid immediately, and the buyer is bounced straight to
     * the callback URL - so the whole checkout flow can be walked end to end
     * before we have API keys.
     *
     * Everything around it is the real implementation: the order and its
     * order_items rows are already written above, prices were re-derived from
     * the database, and the callback shape matches what Paystack sends back
     * (`?trxref=`). Deleting this block and setting PAYMENTS_SIMULATED=false is
     * the entire integration step - the webhook branch for `buyer_order` in
     * PaymentService is already written and waiting.
     *
     * Opt-in by env because it marks orders paid that nobody paid for. This must
     * never be true in production.
     */
    if (this.config.get<string>("PAYMENTS_SIMULATED") === "true") {
      const reference = `SIM-${order.id}-${Date.now()}`;

      await this.db
        .update(schema.orders)
        .set({
          payment_status: "paid",
          status: "confirmed",
          paid_at: new Date(),
          payment_reference: reference,
        })
        .where(eq(schema.orders.id, order.id));

      await this.db
        .delete(schema.cart_items)
        .where(eq(schema.cart_items.user_id, user.sub));

      const appUrl =
        this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";

      return {
        message: "Payment simulated",
        data: {
          authorization_url: `${appUrl}/buyer-dashboard/checkout?trxref=${reference}&simulated=1`,
          reference,
          order_id: order.id,
          simulated: true,
          totals,
        },
      };
    }

    const payment = await this.payment.initializeBuyerOrder({
      email: buyer.email,
      amountKobo: totals.totalKobo,
      orderId: order.id,
      buyerId: user.sub,
    });

    await this.db
      .update(schema.orders)
      .set({ payment_reference: payment.reference })
      .where(eq(schema.orders.id, order.id));

    return {
      message: "Payment initialized",
      data: {
        authorization_url: payment.authorization_url,
        reference: payment.reference,
        order_id: order.id,
        totals,
      },
    };
  }
}
