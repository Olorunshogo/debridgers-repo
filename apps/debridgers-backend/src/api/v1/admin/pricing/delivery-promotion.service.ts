import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, count, desc, eq, gt, isNull, lte, ne, sql } from "drizzle-orm";
import * as schema from "../../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";

// === Types

export type DeliveryPromotionScope = "global" | "zone" | "first_order";

/** The campaign that made one particular delivery free. */
export interface AppliedPromotion {
  id: number;
  name: string;
  scope: DeliveryPromotionScope;
  zone_id: number | null;
  ends_at: Date;
}

/** What a public surface needs to announce a running campaign. */
export interface PublicPromotion {
  name: string;
  scope: DeliveryPromotionScope;
  ends_at: Date;
  /*
   * The zones this campaign actually reaches. A zone-scoped campaign covers
   * one; a global or first-order one covers every active zone. Served
   * explicitly so a zone picker does not have to re-derive the rule.
   */
  zone_ids: number[];
}

export interface CreatePromotionInput {
  name: string;
  scope: DeliveryPromotionScope;
  zone_id?: number | null;
  starts_at: string;
  ends_at: string;
}

/*
 * Which campaign gets the credit when more than one is running.
 *
 * Eligibility is a boolean: any match makes delivery free. This ordering only
 * decides which promotion id is written onto the order, and the narrowest
 * campaign is the honest attribution - a zone campaign that was running for
 * that zone explains the discount better than a site-wide one that was also on.
 */
const ATTRIBUTION_PRECEDENCE: readonly DeliveryPromotionScope[] = [
  "zone",
  "first_order",
  "global",
];

/*
 * Which campaign a public surface announces. The reverse of attribution: the
 * banner is site-wide copy, so the campaign reaching the most visitors is the
 * one worth naming.
 */
const ANNOUNCEMENT_PRECEDENCE: readonly DeliveryPromotionScope[] = [
  "global",
  "zone",
  "first_order",
];

/**
 * Resolves whether a delivery is free because a campaign is running, and
 * records which campaign it was.
 *
 * Eligibility is a data question, not a pricing rule, so none of it lives in
 * `@debridgers/pricing`. That package already takes a `freeDelivery` boolean
 * and already returns the pre-promotion figure; this decides the boolean.
 */
@Injectable()
export class DeliveryPromotionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === Eligibility

  /*
   * The window is half open: a campaign is live from `starts_at` inclusive
   * until `ends_at` exclusive. An inclusive upper bound would leave a campaign
   * live for the single instant it was supposed to stop.
   */
  private async runningPromotions(now: Date) {
    return this.db
      .select({
        id: schema.deliveryPromotions.id,
        name: schema.deliveryPromotions.name,
        scope: schema.deliveryPromotions.scope,
        zone_id: schema.deliveryPromotions.zone_id,
        starts_at: schema.deliveryPromotions.starts_at,
        ends_at: schema.deliveryPromotions.ends_at,
      })
      .from(schema.deliveryPromotions)
      .where(
        and(
          eq(schema.deliveryPromotions.is_active, true),
          isNull(schema.deliveryPromotions.deleted_at),
          lte(schema.deliveryPromotions.starts_at, now),
          gt(schema.deliveryPromotions.ends_at, now),
        ),
      )
      .orderBy(desc(schema.deliveryPromotions.starts_at));
  }

  private static pick<T extends { scope: DeliveryPromotionScope }>(
    rows: readonly T[],
    precedence: readonly DeliveryPromotionScope[],
  ): T | null {
    for (const scope of precedence) {
      const match = rows.find((row) => row.scope === scope);
      if (match) return match;
    }
    return null;
  }

  /*
   * Whether the buyer has yet to complete a first order.
   *
   * Counts orders that were actually PAID FOR, not orders that exist. An order
   * row is inserted before payment, so counting every row meant a buyer who
   * opened checkout and abandoned it, or whose card was declined, had silently
   * spent their one free delivery on nothing. They would then see the offer
   * withdrawn on the retry, with no way to tell why and nothing to appeal to.
   *
   * A cancelled order does not consume it either, for the same reason.
   */
  private async isFirstOrder(buyerId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ placed: count() })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.buyer_id, buyerId),
          eq(schema.orders.payment_status, "paid"),
          ne(schema.orders.status, "cancelled"),
        ),
      );

    return (row?.placed ?? 0) === 0;
  }

  /**
   * The campaign that applies to this basket, or null.
   *
   * A `first_order` campaign is checked against orders already on file rather
   * than against a flag, so it fires exactly once per buyer however many times
   * they reprice a cart during the window.
   */
  async resolve(
    zoneId: number,
    buyerId: number,
    now: Date = new Date(),
  ): Promise<AppliedPromotion | null> {
    const running = await this.runningPromotions(now);
    if (running.length === 0) return null;

    const eligible: typeof running = [];

    for (const promotion of running) {
      if (promotion.scope === "global") {
        eligible.push(promotion);
      } else if (promotion.scope === "zone") {
        if (promotion.zone_id === zoneId) eligible.push(promotion);
      } else if (await this.isFirstOrder(buyerId)) {
        eligible.push(promotion);
      }
    }

    const chosen = DeliveryPromotionService.pick(
      eligible,
      ATTRIBUTION_PRECEDENCE,
    );
    if (!chosen) return null;

    return {
      id: chosen.id,
      name: chosen.name,
      scope: chosen.scope,
      zone_id: chosen.zone_id,
      ends_at: chosen.ends_at,
    };
  }

  // === Public surface

  /** The running campaign a public page should announce, or null. */
  async running(now: Date = new Date()): Promise<PublicPromotion | null> {
    const rows = await this.runningPromotions(now);
    const chosen = DeliveryPromotionService.pick(rows, ANNOUNCEMENT_PRECEDENCE);
    if (!chosen) return null;

    let zoneIds: number[];

    if (chosen.scope === "zone") {
      zoneIds = chosen.zone_id === null ? [] : [chosen.zone_id];
    } else {
      const zones = await this.db
        .select({ id: schema.zones.id })
        .from(schema.zones)
        .where(eq(schema.zones.is_active, true));
      zoneIds = zones.map((zone) => zone.id);
    }

    return {
      name: chosen.name,
      scope: chosen.scope,
      ends_at: chosen.ends_at,
      zone_ids: zoneIds,
    };
  }

  // === Admin

  async list() {
    const rows = await this.db
      .select({
        id: schema.deliveryPromotions.id,
        name: schema.deliveryPromotions.name,
        scope: schema.deliveryPromotions.scope,
        zone_id: schema.deliveryPromotions.zone_id,
        starts_at: schema.deliveryPromotions.starts_at,
        ends_at: schema.deliveryPromotions.ends_at,
        is_active: schema.deliveryPromotions.is_active,
        created_at: schema.deliveryPromotions.created_at,
      })
      .from(schema.deliveryPromotions)
      .where(isNull(schema.deliveryPromotions.deleted_at))
      .orderBy(desc(schema.deliveryPromotions.starts_at));

    const now = Date.now();

    return {
      message: "Delivery promotions retrieved",
      data: rows.map((row) => ({
        ...row,
        is_running:
          row.is_active &&
          row.starts_at.getTime() <= now &&
          row.ends_at.getTime() > now,
      })),
    };
  }

  /**
   * What each campaign gave away, in kobo.
   *
   * The whole reason the pre-promotion fee is stored on the order: a campaign's
   * cost is this one query rather than a reconstruction from rates that may
   * since have changed.
   */
  async cost() {
    const rows = await this.db
      .select({
        promotion_id: schema.orders.delivery_promotion_id,
        name: schema.deliveryPromotions.name,
        orders: count(),
        forgone_kobo: sql<number>`coalesce(sum(${schema.orders.delivery_fee_before_promo}), 0)::int`,
      })
      .from(schema.orders)
      .innerJoin(
        schema.deliveryPromotions,
        eq(schema.deliveryPromotions.id, schema.orders.delivery_promotion_id),
      )
      .groupBy(
        schema.orders.delivery_promotion_id,
        schema.deliveryPromotions.name,
      )
      .orderBy(desc(schema.orders.delivery_promotion_id));

    return { message: "Promotion cost retrieved", data: rows };
  }

  async create(input: CreatePromotionInput, adminId: number) {
    const startsAt = new Date(input.starts_at);
    const endsAt = new Date(input.ends_at);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException("Start and end must be valid dates.");
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException("The end must be after the start.");
    }

    if (input.scope === "zone") {
      if (!input.zone_id) {
        throw new BadRequestException(
          "A zone-scoped promotion needs a zone to apply to.",
        );
      }
      const [zone] = await this.db
        .select({ id: schema.zones.id })
        .from(schema.zones)
        .where(eq(schema.zones.id, input.zone_id))
        .limit(1);

      if (!zone) throw new NotFoundException("Zone not found");
    }

    const [created] = await this.db
      .insert(schema.deliveryPromotions)
      .values({
        name: input.name,
        scope: input.scope,
        /* Held null off the zone scope so a scope change cannot leave a stale
           zone silently narrowing a global campaign. */
        zone_id: input.scope === "zone" ? (input.zone_id ?? null) : null,
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: true,
        created_by_admin_id: adminId,
      })
      .returning();

    return { message: "Promotion created", data: created };
  }

  /**
   * Ends a campaign now.
   *
   * `ends_at` is moved to this instant rather than only clearing `is_active`,
   * so the row still says how long the campaign actually ran when its cost is
   * totalled later.
   */
  async endNow(id: number) {
    const now = new Date();

    const [existing] = await this.db
      .select({
        id: schema.deliveryPromotions.id,
        starts_at: schema.deliveryPromotions.starts_at,
        ends_at: schema.deliveryPromotions.ends_at,
      })
      .from(schema.deliveryPromotions)
      .where(eq(schema.deliveryPromotions.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException("Promotion not found");

    const [updated] = await this.db
      .update(schema.deliveryPromotions)
      .set({
        is_active: false,
        /* A campaign that never started keeps its window; ending it early only
           means it will not run. */
        ends_at:
          existing.starts_at.getTime() <= now.getTime()
            ? now
            : existing.ends_at,
        updated_at: now,
      })
      .where(eq(schema.deliveryPromotions.id, id))
      .returning();

    return { message: "Promotion ended", data: updated };
  }
}
