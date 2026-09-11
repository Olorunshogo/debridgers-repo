import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, desc, sum, count, and, inArray, sql, asc } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { EmailService } from "../../../notification/features/email/email.service";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { SyncCartDto } from "./dto/sync-cart.dto";
import { InitializeOrderPaymentDto } from "./dto/initialize-order-payment.dto";
import { QuoteCartDto } from "./dto/quote-cart.dto";
import { computeDeliveryFee, computeOrderTotals } from "@debridgers/pricing";
import { PaymentService } from "../payment/payment.service";
import { PaystackInvoiceService } from "../payment/paystack-invoice.service";
import { ConfigService } from "@nestjs/config";
import { SystemSettingsService } from "../settings/system-settings.service";
import { DeliveryPromotionService } from "../admin/pricing/delivery-promotion.service";
import { NotificationsService } from "./notifications.service";

/* Alerts are read by people, so they are the one place naira appears. */
const formatKobo = (kobo: number): string =>
  `\u20a6${Math.round(kobo / 100).toLocaleString("en-NG")}`;

@Injectable()
export class BuyerService {
  private readonly logger = new Logger(BuyerService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly payment: PaymentService,
    private readonly invoice: PaystackInvoiceService,
    private readonly config: ConfigService,
    private readonly settings: SystemSettingsService,
    private readonly emailService: EmailService,
    private readonly promotions: DeliveryPromotionService,
    private readonly notifications: NotificationsService,
  ) {}

  private generateOrderReference(): string {
    return `ord_${randomBytes(6).toString("hex")}`;
  }

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

  /*
   * Creates a pending, unpaid order and returns its total. The buyer then picks
   * a payment method and calls POST /buyer/orders/:id/pay.
   *
   * Prices come from the products table, never from the request. The admin sets
   * the price; the browser only says which product and how many. This shares
   * priceBasket with the quote endpoint so the figure shown at checkout is the
   * figure charged.
   */
  async createOrder(dto: CreateOrderDto, user: JwtPayload) {
    if (!dto.cart || dto.cart.length === 0) {
      throw new BadRequestException("Cart cannot be empty");
    }

    const zoneId = await this.resolveDeliveryZone(user, dto.zone_id);
    const { lines, totals, promotion, requiresZoneQuote } =
      await this.priceBasket(dto.cart, zoneId, user.sub);
    const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

    const order = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.orders)
        // unit_price is a legacy column; order_items is the real record.
        .values({
          order_reference: this.generateOrderReference(),
          buyer_id: user.sub,
          zone_id: zoneId,
          quantity: totalQuantity,
          unit_price: Math.round(totals.itemsTotalKobo / totalQuantity),
          handling_fee: totals.handlingFeeKobo,
          delivery_fee: totals.deliveryFeeKobo,
          /*
           * Recorded on every order, not only discounted ones, so the cost of a campaign is one query afterwards.
           * Without it, a free-delivery week left no trace of what it gave away.
           */
          delivery_fee_before_promo: totals.deliveryFeeBeforePromoKobo,
          delivery_promotion_id: promotion?.id ?? null,
          total_amount: totals.totalKobo,
          order_mode: "referral",
          /*
           * requiresZoneQuote means totals.deliveryFeeKobo/totalKobo above are
           * placeholders, not a real price - awaiting_quote blocks payment
           * (see payWithWallet/initiatePaystackPayment) until an admin sets a
           * real delivery_fee and moves the order to "pending" themselves.
           */
          status: requiresZoneQuote ? "awaiting_quote" : "pending",
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
     * A drop that does not pay for its own trip is an operational problem, not
     * the buyer's, so nothing was said to them about it. The buyer admins are
     * told instead, because batching this drop with another in the same zone is
     * what recovers the trip cost, and they are the ones who do it.
     *
     * Fire-and-forget for the same reason the invoice call below is: an alert
     * that fails must never cost us the order it was about.
     */
    if (totals.belowMinimumOrder) {
      void this.notifications.notifyBuyerAdmins({
        type: "order",
        title: `Batch order ${order.order_reference}`,
        description:
          `${formatKobo(totals.itemsTotalKobo)} of goods over ` +
          `${totalQuantity} package${totalQuantity === 1 ? "" : "s"}, which is ` +
          `${formatKobo(totals.minimumOrderShortfallKobo)} below the level at ` +
          `which one drop pays for its own trip. Batch it with another delivery ` +
          `in the same zone.`,
      });
    }

    if (requiresZoneQuote) {
      /*
       * Nothing here has a real delivery fee yet, so an invoice or a receipt
       * naming ₦0 delivery would be a false promise. The admin notification
       * is the only outbound message; the buyer's in-app notification below
       * covers them until the quote lands.
       */
      void this.notifications.notifyBuyerAdmins({
        type: "order",
        title: `Delivery quote needed - order ${order.order_reference}`,
        description:
          `${formatKobo(totals.itemsTotalKobo)} of goods to ${dto.delivery_address}, ` +
          `outside our priced delivery zones. Set a delivery fee for order #${order.id} ` +
          `so the buyer can pay.`,
      });
    } else {
      // Create Paystack invoice (fire-and-forget - Paystack outage won't fail order)
      this.invoice
        .createInvoice(
          order.id,
          user.sub,
          totals.totalKobo,
          order.order_reference,
          user.email,
          `${user.first_name} ${user.last_name}`,
        )
        .then(async (invoiceData) => {
          // Store invoice code in order
          await this.db
            .update(schema.orders)
            .set({ paystack_invoice_code: invoiceData.invoice_code })
            .where(eq(schema.orders.id, order.id));
          this.logger.log(
            `Created Paystack invoice ${invoiceData.invoice_code} for order ${order.order_reference}`,
          );
        })
        .catch((err) => {
          this.logger.error(
            `Failed to create Paystack invoice for order ${order.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });

      /*
       * OrderController also declares POST /buyer/orders and sent this email, but
       * BuyerController registers first and wins the path, so that copy never ran.
       * Fire-and-forget: a mail outage must not fail an order that is already
       * committed. Account manager is the buyer-desk sub-admin when one exists.
       */
      const accountManager = await this.resolveBuyerAccountManager();
      this.emailService
        .sendOrderConfirmation({
          to: user.email,
          buyerFirstName: user.first_name || "Buyer",
          buyerFullName:
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            "Buyer",
          orderReference:
            order.order_reference ||
            `#DBR-${String(order.id).padStart(4, "0")}`,
          deliveryAddress: dto.delivery_address,
          placedAt: order.created_at ?? new Date(),
          items: lines.map((line) => ({
            name: line.name,
            unitLabel: line.unitLabel,
            unit: line.unit,
            quantity: line.quantity,
            unitPriceKobo: line.unit_price_kobo,
            lineTotalKobo: line.unit_price_kobo * line.quantity,
          })),
          itemsTotalKobo: totals.itemsTotalKobo,
          deliveryFeeKobo: totals.deliveryFeeKobo,
          serviceFeeKobo: totals.handlingFeeKobo,
          totalKobo: totals.totalKobo,
          accountManager,
        })
        .catch((err) => {
          this.logger.error(
            `Failed to send order confirmation email for order ${order.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
    }

    await this.db.insert(schema.notifications).values({
      user_id: user.sub,
      title: `Order #${order.id} received`,
      description: requiresZoneQuote
        ? "We have received your order. Your delivery area needs a manual quote - we'll notify you here once it's ready so you can pay."
        : "We have received your order. You will be notified once payment is confirmed.",
      read: false,
    });

    return {
      message: "Order placed successfully",
      data: {
        order_id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        items_total_kobo: totals.itemsTotalKobo,
        delivery_fee_kobo: totals.deliveryFeeKobo,
        handling_fee_kobo: totals.handlingFeeKobo,
        total_kobo: totals.totalKobo,
        zone_id: zoneId,
        delivery_address: order.delivery_address,
        created_at: order.created_at,
        requires_zone_quote: requiresZoneQuote,
      },
    };
  }

  async getOrders(user: JwtPayload) {
    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.buyer_id, user.sub))
      .orderBy(desc(schema.orders.created_at));

    // Unpaid orders must show payment_status, not delivery status
    return {
      message: "Orders retrieved",
      data: orders.map((order) => ({
        ...order,
        status: order.payment_status === "unpaid" ? "pending" : order.status,
      })),
    };
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

    // Unpaid checkouts stay status=pending; they are not in fulfilment.
    const activeStatuses = ["confirmed", "out_for_delivery"] as const;
    const [activeOrdersRow] = await this.db
      .select({ total: count() })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          eq(schema.orders.payment_status, "paid"),
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

    /* Read, never create. A wallet row is made on first deposit; the overview
       showing a zero balance for a buyer who has never funded one is correct. */
    const [walletRow] = await this.db
      .select({ available_balance: schema.buyerWallets.available_balance })
      .from(schema.buyerWallets)
      .where(eq(schema.buyerWallets.user_id, user.sub))
      .limit(1);

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
          eq(schema.orders.payment_status, "paid"),
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
          wallet_balance_kobo: Number(walletRow?.available_balance ?? 0),
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
      .from(schema.productsTable)
      .where(eq(schema.productsTable.is_active, true))
      .orderBy(schema.productsTable.sort_order, schema.productsTable.name);

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

    /*
     * Zero-fill the six buckets. The GROUP BY only returns weeks that had a
     * delivered order, so a quiet fortnight silently shortened the x-axis and
     * made the average per week divide by the wrong denominator.
     */
    const byWeek = new Map(rows.map((r) => [r.week, Number(r.amount ?? 0)]));

    const weeks: Array<{
      week: string;
      amount_kobo: number;
      amount_naira: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const start = startOfWeek(new Date(), i);
      const label = formatWeekLabel(start);
      const amountKobo = byWeek.get(label) ?? 0;

      weeks.push({
        week: label,
        amount_kobo: amountKobo,
        amount_naira: amountKobo / 100,
      });
    }

    return { message: "Weekly spending retrieved", data: weeks };
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
      throw new UnauthorizedException({
        message: "Current password is incorrect",
        errors: [
          {
            field: "current_password",
            message: "Current password is incorrect",
          },
        ],
      });

    if (dto.new_password.length < 8)
      throw new BadRequestException({
        message: "New password must be at least 8 characters",
        errors: [
          {
            field: "password",
            message: "New password must be at least 8 characters",
          },
        ],
      });

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
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        price_kobo: schema.productsTable.price_kobo,
        image_url: schema.productsTable.image_url,
      })
      .from(schema.cart_items)
      .innerJoin(
        schema.productsTable,
        eq(schema.productsTable.id, schema.cart_items.product_id),
      )
      .where(
        and(
          eq(schema.cart_items.user_id, user.sub),
          eq(schema.productsTable.is_active, true),
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
        id: schema.productsTable.id,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        price_kobo: schema.productsTable.price_kobo,
        description: schema.productsTable.description,
        image_url: schema.productsTable.image_url,
      })
      .from(schema.favorites)
      .innerJoin(
        schema.productsTable,
        eq(schema.productsTable.id, schema.favorites.product_id),
      )
      .where(
        and(
          eq(schema.favorites.user_id, user.sub),
          eq(schema.productsTable.is_active, true),
        ),
      )
      .orderBy(desc(schema.favorites.created_at));

    return { message: "Favorites retrieved", data: items };
  }

  /* Idempotent: favouriting twice is a no-op, not an error or a second row. */
  async addFavorite(productId: number, user: JwtPayload) {
    const [product] = await this.db
      .select({ id: schema.productsTable.id })
      .from(schema.productsTable)
      .where(eq(schema.productsTable.id, productId))
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
        id: schema.productsTable.id,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        price_kobo: schema.productsTable.price_kobo,
        description: schema.productsTable.description,
        image_url: schema.productsTable.image_url,
        times_ordered: count(schema.order_items.id),
      })
      .from(schema.order_items)
      .innerJoin(
        schema.orders,
        eq(schema.orders.id, schema.order_items.order_id),
      )
      .innerJoin(
        schema.productsTable,
        eq(schema.productsTable.id, schema.order_items.product_id),
      )
      .where(
        and(
          eq(schema.orders.buyer_id, user.sub),
          eq(schema.productsTable.is_active, true),
        ),
      )
      .groupBy(
        schema.productsTable.id,
        schema.productsTable.name,
        schema.productsTable.unit,
        schema.productsTable.price_kobo,
        schema.productsTable.description,
        schema.productsTable.image_url,
      )
      .orderBy(
        desc(count(schema.order_items.id)),
        desc(sql`max(${schema.orders.created_at})`),
      )
      .limit(limit);

    return { message: "Buy again retrieved", data: rows };
  }

  /*
   * DEPRECATED. Superseded by the `delivery_promotions` table, which can
   * express a window with two ends, scope to a zone or to a buyer's first
   * order, and be joined to the orders it discounted.
   *
   * This key was never writable in any case: admin.service.updateSetting has an
   * allowlist that does not include it, so nothing could ever turn it on. It is
   * read for one release only, in case a row was set directly in the database,
   * and should be deleted with the next migration that touches settings.
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
    buyerId: number,
  ) {
    const productIds = lines.map((line) => line.product_id);
    const catalogue = await this.db
      .select({
        id: schema.productsTable.id,
        price_kobo: schema.productsTable.price_kobo,
        name: schema.productsTable.name,
        unit: schema.productsTable.unit,
        measure_value: schema.productsTable.measure_value,
        measure_unit: schema.productsTable.measure_unit,
      })
      .from(schema.productsTable)
      .where(
        and(
          inArray(schema.productsTable.id, productIds),
          eq(schema.productsTable.is_active, true),
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
      const product = byId.get(line.product_id)!;
      const measure =
        product.measure_value && product.measure_unit
          ? `${product.measure_value}${product.measure_unit}`
          : null;
      const unitLabel = measure ? `${measure} ${product.unit}` : product.unit;
      return {
        product_id: line.product_id,
        name: product.name,
        unit: product.unit,
        unitLabel,
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
        tier_one_per_package_kobo: schema.zones.tier_one_per_package_kobo,
        tier_two_per_package_kobo: schema.zones.tier_two_per_package_kobo,
        delivery_cap_kobo: schema.zones.delivery_cap_kobo,
        requires_quote: schema.zones.requires_quote,
      })
      .from(schema.zones)
      .where(eq(schema.zones.id, zoneId))
      .limit(1);

    /*
     * Free either because this zone is standing policy, or because a campaign
     * covers this basket. Zone-level wins independently of any campaign window,
     * so a permanently-free area does not start charging when the campaign
     * ends.
     */
    const zoneIsStandingFree = Boolean(zone?.free_delivery);
    const promotion = await this.promotions.resolve(zoneId, buyerId);
    const freeDelivery =
      zoneIsStandingFree ||
      promotion !== null ||
      /* Deprecated fallback, one release only. See isFreeDeliveryActive. */
      (await this.isFreeDeliveryActive());

    /*
     * The minimum order is no longer enforced against the buyer.
     *
     * It is a solvency rule about a single drop, and refusing a keg of oil to
     * defend it puts our operating problem in the buyer's way. The trip cost is
     * recovered by batching the drop with another in the same zone instead, so
     * the flag travels on the totals and reaches the buyer admin who does the
     * batching. See computeOrderTotals.belowMinimumOrder.
     */

    const fee = computeDeliveryFee({
      zoneFeeKobo: zone?.delivery_fee ?? 0,
      packageCount,
      freeDelivery,
      tierOnePerPackageKobo: zone?.tier_one_per_package_kobo,
      tierTwoPerPackageKobo: zone?.tier_two_per_package_kobo,
      deliveryCapKobo: zone?.delivery_cap_kobo,
    });

    return {
      lines: priced,
      totals: computeOrderTotals(itemsTotalKobo, fee, packageCount),
      packageCount,
      /*
       * Attributed to a campaign only when the zone was not already free.
       * Crediting a campaign for an order in a permanently-free area would overstate what the campaign actually gave away.
       */
      promotion: zoneIsStandingFree ? null : promotion,
      /*
       * A zone with no priced rates (an LGA outside the 3 measured metro
       * zones). The delivery figure above is a meaningless 0, not a real
       * quote - the caller must not let this basket be paid for until an
       * admin sets a real delivery_fee and the order leaves awaiting_quote.
       */
      requiresZoneQuote: Boolean(zone?.requires_quote),
    };
  }

  /*
   * The buyer-desk sub-admin shown as "account manager" on order receipts.
   * Same audience as notifyBuyerAdmins: sub-admins first, any admin if none
   * exist yet. Phone falls back to support when the admin row has none.
   */
  private async resolveBuyerAccountManager(): Promise<{
    name: string;
    phoneDisplay: string;
    phoneTel: string;
  } | null> {
    const selectManager = {
      first_name: schema.users.first_name,
      last_name: schema.users.last_name,
      phone: schema.users.phone,
    } as const;

    let [manager] = await this.db
      .select(selectManager)
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, "admin"),
          eq(schema.users.admin_tier, "sub"),
          eq(schema.users.is_blocked, false),
        ),
      )
      .orderBy(asc(schema.users.id))
      .limit(1);

    if (!manager) {
      [manager] = await this.db
        .select(selectManager)
        .from(schema.users)
        .where(
          and(
            eq(schema.users.role, "admin"),
            eq(schema.users.is_blocked, false),
          ),
        )
        .orderBy(asc(schema.users.id))
        .limit(1);
    }

    if (!manager) return null;

    const name =
      `${manager.first_name} ${manager.last_name}`.trim() ||
      "Debridgers Support";
    const rawPhone = manager.phone?.trim();
    if (!rawPhone) {
      return {
        name,
        phoneDisplay: "0701 228 8798",
        phoneTel: "tel:+2347012288798",
      };
    }

    const digits = rawPhone.replace(/\D/g, "");
    const e164 =
      digits.startsWith("234") && digits.length >= 13
        ? `+${digits}`
        : digits.startsWith("0") && digits.length === 11
          ? `+234${digits.slice(1)}`
          : rawPhone.startsWith("+")
            ? rawPhone
            : `+${digits}`;
    const phoneDisplay =
      e164.startsWith("+234") && e164.length === 14
        ? `0${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`
        : rawPhone;

    return {
      name,
      phoneDisplay,
      phoneTel: `tel:${e164}`,
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
        throw new BadRequestException({
          message: "We do not deliver to that area yet. Please choose another.",
          errors: [
            {
              field: "zone_id",
              message:
                "We do not deliver to that area yet. Please choose another.",
            },
          ],
        });
      }
      return zone.id;
    }

    const [buyer] = await this.db
      .select({ zone_id: schema.users.zone_id })
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1);

    if (!buyer?.zone_id) {
      throw new BadRequestException({
        message: "Please choose a delivery area before checking out.",
        errors: [
          {
            field: "zone_id",
            message: "Please choose a delivery area before checking out.",
          },
        ],
      });
    }
    return buyer.zone_id;
  }

  /** Live pricing for the cart summary, so the buyer sees fees before paying. */
  async quoteCart(dto: QuoteCartDto, user: JwtPayload) {
    const zoneId = await this.resolveDeliveryZone(user, dto.zone_id);
    const { totals, packageCount, promotion, requiresZoneQuote } =
      await this.priceBasket(dto.cart, zoneId, user.sub);

    return {
      message: "Quote generated",
      data: {
        ...totals,
        zone_id: zoneId,
        package_count: packageCount,
        // Named so the delivery line can say which campaign struck the fee through, rather than only that it is free.
        delivery_promotion: promotion,
        // True when deliveryFeeKobo/totalKobo above are unpriced placeholders - see priceBasket.
        requires_zone_quote: requiresZoneQuote,
      },
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
    const { lines, totals, promotion, requiresZoneQuote } =
      await this.priceBasket(dto.cart, zoneId, user.sub);
    const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

    const order = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.orders)
        // unit_price is a legacy column; order_items is the real record.
        .values({
          order_reference: `ord_${randomBytes(6).toString("hex")}`,
          buyer_id: user.sub,
          zone_id: zoneId,
          quantity: totalQuantity,
          unit_price: Math.round(totals.itemsTotalKobo / totalQuantity),
          handling_fee: totals.handlingFeeKobo,
          delivery_fee: totals.deliveryFeeKobo,
          /*
           * Recorded on every order, not only discounted ones, so the cost of a campaign is one query afterwards.
           * Without it, a free-delivery week left no trace of what it gave away.
           */
          delivery_fee_before_promo: totals.deliveryFeeBeforePromoKobo,
          delivery_promotion_id: promotion?.id ?? null,
          total_amount: totals.totalKobo,
          order_mode: "referral",
          status: requiresZoneQuote ? "awaiting_quote" : "pending",
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
     * No card charge to attempt: delivery is unpriced, so there is nothing
     * to send to Paystack. The buyer pays via the normal /pay endpoint once
     * an admin sets a real delivery_fee and the order leaves awaiting_quote.
     */
    if (requiresZoneQuote) {
      void this.notifications.notifyBuyerAdmins({
        type: "order",
        title: `Delivery quote needed - order ${order.order_reference}`,
        description:
          `${formatKobo(totals.itemsTotalKobo)} of goods to ${dto.delivery_address}, ` +
          `outside our priced delivery zones. Set a delivery fee for order #${order.id} ` +
          `so the buyer can pay.`,
      });

      await this.db.insert(schema.notifications).values({
        user_id: user.sub,
        title: `Order #${order.id} received`,
        description:
          "We have received your order. Your delivery area needs a manual quote - we'll notify you here once it's ready so you can pay.",
        read: false,
      });

      return {
        message: "Order placed, awaiting delivery quote",
        data: {
          order_id: order.id,
          requires_zone_quote: true,
          totals,
        },
      };
    }

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

    /*
     * The order and its items are committed above, before Paystack is called.
     * If the gateway call fails the order would otherwise sit pending and
     * unpaid forever, with no way for the buyer to pay it or clear it, so it
     * is cancelled here. Cancelled rather than deleted to keep the audit trail,
     * and the original error still reaches the client.
     */
    let payment: Awaited<ReturnType<typeof this.payment.initializeBuyerOrder>>;

    try {
      payment = await this.payment.initializeBuyerOrder({
        email: buyer.email,
        amountKobo: totals.totalKobo,
        orderId: order.id,
        buyerId: user.sub,
      });
    } catch (err) {
      await this.db
        .update(schema.orders)
        .set({
          status: "cancelled",
          cancellation_reason: "Payment initialization failed",
        })
        .where(eq(schema.orders.id, order.id));

      this.logger.error(
        `Payment initialization failed for order ${order.id}, order cancelled: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      throw err;
    }

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

// === Weekly spending helpers

/*
 * Postgres date_trunc('week', ...) is ISO: weeks start Monday. These mirror
 * that so the labels generated here line up with the labels the query groups
 * by, otherwise zero-filling would never match a real bucket.
 */
function startOfWeek(from: Date, weeksAgo: number): Date {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);

  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (isoDay - 1) - weeksAgo * 7);

  return d;
}

/* Matches to_char(..., 'Mon DD') in the query above. */
function formatWeekLabel(date: Date): string {
  const month = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${month} ${day}`;
}
