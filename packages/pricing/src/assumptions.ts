/*
 * Every number the business runs on that has not been measured yet.
 *
 * The point is not the fallbacks.
 * The point is that each figure carries its own status, so a contribution margin computed from guesses is visibly computed from guesses, and nobody has to remember which is which.
 * When a real figure arrives, one value changes here and everything downstream follows.
 *
 * Fallbacks exist so the platform runs while the counting happens.
 * They are deliberately conservative: a fallback that flatters the margin is worse than no fallback at all, because it reads as fact.
 *
 * Derivations and the reasoning behind every estimate: docs/business/BusinessModel.md.
 */

// === Types

/**
 * How much weight a figure carries.
 *
 * `measured` came from a real invoice, a real trip, or a real query.
 * `estimated` is a considered guess with a stated basis.
 * `unknown` has no basis at all and is a placeholder to keep arithmetic running.
 */
export type MetricStatus = "measured" | "estimated" | "unknown";

/*
 * `basis` is where the figure came from, or what the guess rests on.
 * `measuredAt` is the ISO date the figure was measured, absent while it is not.
 */
export interface Metric<T = number> {
  value: T;
  status: MetricStatus;
  basis: string;
  measuredAt?: string;
  unit: string;
}

/** True when a figure is real rather than a placeholder. */
export function isMeasured(metric: Metric<unknown>): boolean {
  return metric.status === "measured";
}

/**
 * Every unmeasured metric in a set, so a report can carry its own health
 * warning instead of presenting estimates as findings.
 */
export function unmeasured(metrics: Record<string, Metric<unknown>>): string[] {
  return Object.entries(metrics)
    .filter(([, m]) => m.status !== "measured")
    .map(([name]) => name);
}

// === Landed cost, per product
//
// The single most load-bearing unknown in the business: every margin figure rests on the procurement spread, and the spread cannot be known until the true delivered cost of a bag is known.
// Keyed by the catalogue product name.

/** Target procurement spread, as a fraction of the buyer price. */
export const TARGET_PROCUREMENT_SPREAD = 0.06;

/**
 * Landed cost per package, in kobo.
 *
 * Until a product is measured, its cost is implied from the target spread, which means the margin it reports is the target rather than the truth.
 * That is the honest placeholder: it never claims a margin the business has not proven.
 */
export const LANDED_COST_KOBO: Record<string, Metric> = {};

/** Implied landed cost for a product with no measurement, in kobo. */
export function impliedLandedCostKobo(buyerPriceKobo: number): number {
  return Math.round(buyerPriceKobo * (1 - TARGET_PROCUREMENT_SPREAD));
}

/**
 * Landed cost for a product: the measured figure when one exists, otherwise the
 * figure implied by the target spread.
 */
export function landedCostKobo(
  productName: string,
  buyerPriceKobo: number,
): Metric {
  const measured = LANDED_COST_KOBO[productName];
  if (measured) return measured;

  return {
    value: impliedLandedCostKobo(buyerPriceKobo),
    status: "unknown",
    basis: `Implied by the ${TARGET_PROCUREMENT_SPREAD * 100}% target spread, not measured. Reports the target margin, not the real one.`,
    unit: "kobo per package",
  };
}

// === Operating metrics

/*
 * Inbound haulage, loading, burn and order admin.
 * Loading is the only one with a considered basis; the rest are placeholders waiting on a count.
 */

export const INBOUND_HAULAGE_KOBO: Metric = {
  value: 0,
  status: "unknown",
  basis: "Not measured. Counted per bag from supplier to store.",
  unit: "kobo per package",
};

export const LOADING_50KG_KOBO: Metric = {
  value: 30_000,
  status: "estimated",
  basis: "A 50kg package is a one-person lift.",
  unit: "kobo per package",
};

export const LOADING_100KG_KOBO: Metric = {
  value: 50_000,
  status: "estimated",
  basis: "A 100kg package is a two-person lift.",
  unit: "kobo per package",
};

export const MONTHLY_BURN_KOBO: Metric = {
  value: 0,
  status: "unknown",
  basis: "Not measured. Without it there is no runway figure.",
  unit: "kobo per month",
};

export const ORDER_ADMIN_MINUTES: Metric = {
  value: 0,
  status: "unknown",
  basis:
    "Not measured. The largest cost line in the business is unpaid founder time, recorded at zero until this is logged.",
  unit: "minutes per order",
};

// === Trading metrics
//
// Unlike the above these are queries, not counts: the orders table already holds them.
// They stay here so a report reads every figure from one place.

export const GMV_KOBO: Metric = {
  value: 0,
  status: "unknown",
  basis: "A query over paid orders. Not yet run.",
  unit: "kobo per month",
};

export const AVERAGE_ORDER_VALUE_KOBO: Metric = {
  value: 0,
  status: "unknown",
  basis: "A query over paid orders. Not yet run.",
  unit: "kobo",
};

// === Warehouse

export const WAREHOUSE_CAPACITY_KG: Metric = {
  value: 1000,
  status: "measured",
  basis:
    "One tonne: 10 bags of beans at 100kg, or 20 bags of rice at 50kg. Standing capacity, not monthly throughput.",
  measuredAt: "2026-08-29",
  unit: "kg",
};

export const WAREHOUSE_MONTHLY_COST_KOBO: Metric = {
  value: 2_000_000,
  status: "measured",
  basis:
    "A co-founder's house, booked as an in-kind contribution at ₦20,000 per month.",
  measuredAt: "2026-08-29",
  unit: "kobo per month",
};

// === Payment rails
//
// Paystack's rates, not Debridgers'.
// They belong to the gateway, so they are recorded rather than decided, and want verifying on the dashboard.

export const PAYSTACK_CARD_RATE = 0.015;
export const PAYSTACK_CARD_FLAT_KOBO = 10_000;
export const PAYSTACK_CARD_CAP_KOBO = 200_000;

/** What Paystack takes on a card transaction of this size, in kobo. */
export function paystackCardFeeKobo(amountKobo: number): number {
  const raw =
    Math.round(amountKobo * PAYSTACK_CARD_RATE) + PAYSTACK_CARD_FLAT_KOBO;
  return Math.min(raw, PAYSTACK_CARD_CAP_KOBO);
}

/** Everything above, for a report that wants to state its own confidence. */
export const OPERATING_METRICS: Record<string, Metric> = {
  inboundHaulage: INBOUND_HAULAGE_KOBO,
  loading50kg: LOADING_50KG_KOBO,
  loading100kg: LOADING_100KG_KOBO,
  monthlyBurn: MONTHLY_BURN_KOBO,
  orderAdminMinutes: ORDER_ADMIN_MINUTES,
  gmv: GMV_KOBO,
  averageOrderValue: AVERAGE_ORDER_VALUE_KOBO,
  warehouseCapacityKg: WAREHOUSE_CAPACITY_KG,
  warehouseMonthlyCost: WAREHOUSE_MONTHLY_COST_KOBO,
};
