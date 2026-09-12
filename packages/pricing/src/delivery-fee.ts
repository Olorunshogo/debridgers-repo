/*
 * Order pricing: delivery, the cost-to-serve fee, and the minimum order.
 *
 * Delivery is priced purely on distance from the Narayi warehouse, in a straight line from the LGA the buyer is in.
 * Package count does not factor in at all - a one-bag order and a twenty-bag order to the same LGA pay the same delivery fee.
 * This is a deliberate policy choice, not a technical shortcut: the previous package-taper model existed because a vehicle carrying one bag costs nearly what it costs carrying six, but the fee the buyer is charged is now decoupled from that cost-recovery question.
 *
 * The formula and the base/rate figures are fixed policy, set from a single reference point (Narayi to High Cost, effectively zero distance, priced at 800-1000 naira) and extrapolated outward with a flat per-kilometre rate.
 *
 * Pure functions with no database access and no framework imports, so the quote endpoint, the checkout charge and the buying desk cannot drift apart, since all three call this, and so it stays testable without a server.
 *
 * This is the source of truth.
 * Nothing may restate these numbers: a second copy is how a ₦1,400 unit price outlived the product it described.
 *
 * Full derivation in docs/business/BusinessModel.md.
 */

// === Delivery

/** Flat fee floor, covering the warehouse's own neighbourhood, in kobo. */
export const DISTANCE_BASE_FEE_KOBO = 70_000;

/** Charged per kilometre of distance from the warehouse, in kobo. */
export const DISTANCE_RATE_PER_KM_KOBO = 5_000;

/** The computed fee is floored to the nearest multiple of this, in kobo. */
export const DISTANCE_ROUNDING_KOBO = 10_000;

// === Cost-to-serve

/*
 * Formerly the "handling fee", which is why it used to be ₦100 flat.
 * It is not a charge for lifting a bag.
 * It covers the payment rail plus the order admin around it: invoicing, reconciliation, support, and the replacement provision.
 *
 * The break-even rate, where the fee exactly pays for the card processing on the whole transaction, is 2.10% on the cheapest hero order (a ₦28,000 keg of palm oil) and lower on everything above it.
 * 3% clears that with real headroom, and the headroom is the point: the payment rail is the only cost-to-serve component anybody has measured, and the other five are all still absorbed by unpaid founder time.
 *
 * At 3% the fee covers roughly the full admin cost of a single-bag order rather than half of it, which is what turns it from a payment pass-through into a charge that actually pays for serving the order.
 *
 * The floor protects the small order, the cap protects the relationship, and the middle is where the fee does real work.
 */

/** Cost-to-serve rate, as a fraction of the items subtotal. */
export const SERVICE_FEE_RATE = 0.03;

/*
 * The floor no longer binds on a delivery order: 3% of the ₦25,000 minimum is ₦750.
 * It still matters for anything exempted from that minimum, such as a pickup or a same-zone add-on, which is why it stays.
 */

/** Minimum cost-to-serve fee, in kobo. */
export const SERVICE_FEE_MIN_KOBO = 50_000;

/** Maximum cost-to-serve fee, in kobo. */
export const SERVICE_FEE_MAX_KOBO = 500_000;

// === Order limits

/*
 * Below the minimum, no fee structure covers the trip: a ₦12,000 order against a ₦4,000 vehicle loses money however the fees are arranged.
 * This is a solvency rule, not a policy preference.
 */

/** Smallest items subtotal accepted for delivery, in kobo. */
export const MINIMUM_ORDER_KOBO = 2_500_000;

/** Smallest package count accepted for delivery. */
export const MINIMUM_ORDER_PACKAGES = 2;

/*
 * Above these, a flat per-LGA fee stops making sense for the size of the drop: a 35-package order needs a truck, not the van the fee assumes.
 * Flagged rather than blocked, so an admin quotes it instead of checkout silently selling below cost.
 */

/** Package count above which the order should be quoted individually. */
export const INDIVIDUAL_QUOTE_PACKAGE_THRESHOLD = 20;

/** Items subtotal above which the order should be quoted individually, in kobo. */
export const INDIVIDUAL_QUOTE_SUBTOTAL_KOBO = 75_000_000;

/*
 * `distanceKm` is the delivery LGA's straight-line distance from the Narayi warehouse.
 * `freeDelivery` is set while a free-delivery promotion is running.
 */
export interface DeliveryFeeInput {
  distanceKm: number;
  freeDelivery?: boolean;
}

/*
 * `deliveryFeeKobo` is what the buyer is actually charged, after any promotion.
 * `deliveryFeeBeforePromoKobo` is what it would have cost without one, for "was/now" copy.
 */
export interface DeliveryFeeBreakdown {
  distanceKm: number;
  deliveryFeeKobo: number;
  deliveryFeeBeforePromoKobo: number;
  freeDelivery: boolean;
}

export function computeDeliveryFee(
  input: DeliveryFeeInput,
): DeliveryFeeBreakdown {
  const { distanceKm, freeDelivery = false } = input;

  const raw = DISTANCE_BASE_FEE_KOBO + DISTANCE_RATE_PER_KM_KOBO * distanceKm;
  const beforePromo =
    Math.floor(raw / DISTANCE_ROUNDING_KOBO) * DISTANCE_ROUNDING_KOBO;

  // The full price is still computed during a promo so the UI can show it struck through next to FREE.
  return {
    distanceKm,
    deliveryFeeKobo: freeDelivery ? 0 : beforePromo,
    deliveryFeeBeforePromoKobo: beforePromo,
    freeDelivery,
  };
}

/** Cost-to-serve fee for a basket: a rate on the goods, bounded both ways. */
export function computeServiceFee(itemsTotalKobo: number): number {
  const raw = Math.round(itemsTotalKobo * SERVICE_FEE_RATE);
  return Math.min(Math.max(raw, SERVICE_FEE_MIN_KOBO), SERVICE_FEE_MAX_KOBO);
}

/**
 * Why a basket is too small to deliver at a positive contribution, or null when it is large enough.
 *
 * Reports rather than throws, because this package is shared by the API and the browser and must not depend on either one's error type.
 *
 * Nothing blocks a buyer on this.
 * The message is written for an operator: it reaches the buyer admin, who batches the drop with another in the same zone so the trip is shared.
 * A buyer who wants one keg of oil gets one keg of oil.
 */
export function minimumOrderViolation(
  itemsTotalKobo: number,
  packageCount: number,
): string | null {
  const tooCheap = itemsTotalKobo < MINIMUM_ORDER_KOBO;
  const tooFew = packageCount < MINIMUM_ORDER_PACKAGES;

  if (tooCheap && tooFew) {
    return `Minimum order for delivery is ₦${(MINIMUM_ORDER_KOBO / 100).toLocaleString()} or ${MINIMUM_ORDER_PACKAGES} packages.`;
  }

  return null;
}

/*
 * `serviceFeeKobo` is the cost-to-serve fee.
 * `handlingFeeKobo` is the same value, under the name the orders table still uses; kept so the DB column and every existing consumer keep working without a migration, and `serviceFeeKobo` is preferred in new code.
 * `requiresIndividualQuote` is true when this order is too large for the flat per-LGA fee and needs a manual quote.
 *
 * `belowMinimumOrder` is true when the basket is below the delivery minimum.
 * It is reported, never enforced against the buyer: refusing a single keg of oil to protect a per-drop margin is the wrong trade, since the buyer feels the rule and the rule is ours, not theirs.
 * The trip cost is recovered by batching the drop with another in the same zone, which is an operational answer, so this flag exists to reach the person who does the batching.
 * `minimumOrderShortfallKobo` says how far below the naira minimum the basket sits, in kobo, or 0 when it is not below it; the package shortfall is not money and is not folded in here.
 */
export interface OrderTotals extends DeliveryFeeBreakdown {
  itemsTotalKobo: number;
  serviceFeeKobo: number;
  handlingFeeKobo: number;
  requiresIndividualQuote: boolean;
  belowMinimumOrder: boolean;
  minimumOrderShortfallKobo: number;
  totalKobo: number;
}

export function computeOrderTotals(
  itemsTotalKobo: number,
  fee: DeliveryFeeBreakdown,
  packageCount = 0,
): OrderTotals {
  const serviceFeeKobo = computeServiceFee(itemsTotalKobo);
  const belowMinimumOrder =
    minimumOrderViolation(itemsTotalKobo, packageCount) !== null;

  return {
    ...fee,
    itemsTotalKobo,
    serviceFeeKobo,
    handlingFeeKobo: serviceFeeKobo,
    requiresIndividualQuote:
      packageCount > INDIVIDUAL_QUOTE_PACKAGE_THRESHOLD ||
      itemsTotalKobo > INDIVIDUAL_QUOTE_SUBTOTAL_KOBO,
    belowMinimumOrder,
    minimumOrderShortfallKobo: belowMinimumOrder
      ? Math.max(0, MINIMUM_ORDER_KOBO - itemsTotalKobo)
      : 0,
    totalKobo: itemsTotalKobo + fee.deliveryFeeKobo + serviceFeeKobo,
  };
}
