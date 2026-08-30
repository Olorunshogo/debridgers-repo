"use strict";
/*
 * Every number the business runs on that has not been measured yet.
 *
 * The point is not the fallbacks. The point is that each figure carries its own
 * status, so a contribution margin computed from guesses is visibly computed
 * from guesses, and nobody has to remember which is which. When a real figure
 * arrives, one value changes here and everything downstream follows.
 *
 * Fallbacks exist so the platform runs while the counting happens. They are
 * deliberately conservative: a fallback that flatters the margin is worse than
 * no fallback at all, because it reads as fact.
 *
 * Derivations and the reasoning behind every estimate: docs/business/BusinessModel.md.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPERATING_METRICS =
  exports.PAYSTACK_CARD_CAP_KOBO =
  exports.PAYSTACK_CARD_FLAT_KOBO =
  exports.PAYSTACK_CARD_RATE =
  exports.WAREHOUSE_MONTHLY_COST_KOBO =
  exports.WAREHOUSE_CAPACITY_KG =
  exports.AVERAGE_ORDER_VALUE_KOBO =
  exports.GMV_KOBO =
  exports.ORDER_ADMIN_MINUTES =
  exports.MONTHLY_BURN_KOBO =
  exports.LOADING_100KG_KOBO =
  exports.LOADING_50KG_KOBO =
  exports.INBOUND_HAULAGE_KOBO =
  exports.LANDED_COST_KOBO =
  exports.TARGET_PROCUREMENT_SPREAD =
    void 0;
exports.isMeasured = isMeasured;
exports.unmeasured = unmeasured;
exports.impliedLandedCostKobo = impliedLandedCostKobo;
exports.landedCostKobo = landedCostKobo;
exports.paystackCardFeeKobo = paystackCardFeeKobo;
/** True when a figure is real rather than a placeholder. */
function isMeasured(metric) {
  return metric.status === "measured";
}
/**
 * Every unmeasured metric in a set, so a report can carry its own health
 * warning instead of presenting estimates as findings.
 */
function unmeasured(metrics) {
  return Object.entries(metrics)
    .filter(([, m]) => m.status !== "measured")
    .map(([name]) => name);
}
// === Landed cost, per product
//
// The single most load-bearing unknown in the business: every margin figure
// rests on the procurement spread, and the spread cannot be known until the
// true delivered cost of a bag is known. Keyed by the catalogue product name.
/** Target procurement spread, as a fraction of the buyer price. */
exports.TARGET_PROCUREMENT_SPREAD = 0.06;
/**
 * Landed cost per package, in kobo.
 *
 * Until a product is measured, its cost is implied from the target spread,
 * which means the margin it reports is the target rather than the truth. That
 * is the honest placeholder: it never claims a margin the business has not
 * proven.
 */
exports.LANDED_COST_KOBO = {};
/** Implied landed cost for a product with no measurement, in kobo. */
function impliedLandedCostKobo(buyerPriceKobo) {
  return Math.round(buyerPriceKobo * (1 - exports.TARGET_PROCUREMENT_SPREAD));
}
/**
 * Landed cost for a product: the measured figure when one exists, otherwise the
 * figure implied by the target spread.
 */
function landedCostKobo(productName, buyerPriceKobo) {
  const measured = exports.LANDED_COST_KOBO[productName];
  if (measured) return measured;
  return {
    value: impliedLandedCostKobo(buyerPriceKobo),
    status: "unknown",
    basis: `Implied by the ${exports.TARGET_PROCUREMENT_SPREAD * 100}% target spread, not measured. Reports the target margin, not the real one.`,
    unit: "kobo per package",
  };
}
// === Operating metrics
/*
 * Inbound haulage, loading, burn and order admin. Loading is the only one with
 * a considered basis; the rest are placeholders waiting on a count.
 */
exports.INBOUND_HAULAGE_KOBO = {
  value: 0,
  status: "unknown",
  basis: "Not measured. Counted per bag from supplier to store.",
  unit: "kobo per package",
};
exports.LOADING_50KG_KOBO = {
  value: 30_000,
  status: "estimated",
  basis: "A 50kg package is a one-person lift.",
  unit: "kobo per package",
};
exports.LOADING_100KG_KOBO = {
  value: 50_000,
  status: "estimated",
  basis: "A 100kg package is a two-person lift.",
  unit: "kobo per package",
};
exports.MONTHLY_BURN_KOBO = {
  value: 0,
  status: "unknown",
  basis: "Not measured. Without it there is no runway figure.",
  unit: "kobo per month",
};
exports.ORDER_ADMIN_MINUTES = {
  value: 0,
  status: "unknown",
  basis:
    "Not measured. The largest cost line in the business is unpaid founder time, recorded at zero until this is logged.",
  unit: "minutes per order",
};
// === Trading metrics
//
// Unlike the above these are queries, not counts: the orders table already
// holds them. They stay here so a report reads every figure from one place.
exports.GMV_KOBO = {
  value: 0,
  status: "unknown",
  basis: "A query over paid orders. Not yet run.",
  unit: "kobo per month",
};
exports.AVERAGE_ORDER_VALUE_KOBO = {
  value: 0,
  status: "unknown",
  basis: "A query over paid orders. Not yet run.",
  unit: "kobo",
};
// === Warehouse
exports.WAREHOUSE_CAPACITY_KG = {
  value: 1000,
  status: "measured",
  basis:
    "One tonne: 10 bags of beans at 100kg, or 20 bags of rice at 50kg. Standing capacity, not monthly throughput.",
  measuredAt: "2026-08-29",
  unit: "kg",
};
exports.WAREHOUSE_MONTHLY_COST_KOBO = {
  value: 2_000_000,
  status: "measured",
  basis:
    "A co-founder's house, booked as an in-kind contribution at ₦20,000 per month.",
  measuredAt: "2026-08-29",
  unit: "kobo per month",
};
// === Payment rails
//
// Paystack's rates, not Debridgers'. They belong to the gateway, so they are
// recorded rather than decided, and want verifying on the dashboard.
exports.PAYSTACK_CARD_RATE = 0.015;
exports.PAYSTACK_CARD_FLAT_KOBO = 10_000;
exports.PAYSTACK_CARD_CAP_KOBO = 200_000;
/** What Paystack takes on a card transaction of this size, in kobo. */
function paystackCardFeeKobo(amountKobo) {
  const raw =
    Math.round(amountKobo * exports.PAYSTACK_CARD_RATE) +
    exports.PAYSTACK_CARD_FLAT_KOBO;
  return Math.min(raw, exports.PAYSTACK_CARD_CAP_KOBO);
}
/** Everything above, for a report that wants to state its own confidence. */
exports.OPERATING_METRICS = {
  inboundHaulage: exports.INBOUND_HAULAGE_KOBO,
  loading50kg: exports.LOADING_50KG_KOBO,
  loading100kg: exports.LOADING_100KG_KOBO,
  monthlyBurn: exports.MONTHLY_BURN_KOBO,
  orderAdminMinutes: exports.ORDER_ADMIN_MINUTES,
  gmv: exports.GMV_KOBO,
  averageOrderValue: exports.AVERAGE_ORDER_VALUE_KOBO,
  warehouseCapacityKg: exports.WAREHOUSE_CAPACITY_KG,
  warehouseMonthlyCost: exports.WAREHOUSE_MONTHLY_COST_KOBO,
};
//# sourceMappingURL=assumptions.js.map
