/*
 * Order pricing: delivery, the cost-to-serve fee, and the minimum order.
 *
 * Delivery is per package, not per kilo.
 * What fills a vehicle is packages: a 50kg bag and a 25 litre keg each occupy one slot.
 * Pricing on mass would need density constants for oil and an average tuber weight for yam, both guesses, to answer a question the driver settles by counting.
 *
 * The trip is the cost, not the bag.
 * A vehicle carrying one bag carries six for nearly the same money, so the base covers two packages and the per-package rate tapers after that.
 * A flat per-package rate over-charges exactly the large B2B order the business depends on.
 *
 * Rates come from measurement, not estimate: a two-package outbound leg in Kaduna South, Central Market to Mai Gero near Barnawa, was measured at ₦4,000.
 * The previous ₦500 zone base recovered one eighth of that, which is why every small order lost money.
 *
 * Pure functions with no database access and no framework imports, so the quote endpoint, the checkout charge and the buying desk cannot drift apart, since all three call this, and so it stays testable without a server.
 *
 * This is the source of truth.
 * Nothing may restate these numbers: a second copy is how a ₦1,400 unit price outlived the product it described.
 *
 * Full derivation in docs/business/BusinessModel.md.
 */

// === Delivery

/** Packages covered by the zone base fee before extras are charged. */
export const PACKAGES_INCLUDED_IN_BASE = 2;

/** Packages charged at the first taper step, being packages 3 to 6. */
export const TIER_ONE_PACKAGE_COUNT = 4;

/*
 * The taper is per zone, because distance changes what a marginal package costs, not just what the trip costs.
 * The rates below are the Kaduna South ones and are the fallback for a zone whose own rates are not set.
 */

// === The taper band
//
// The taper is what makes packages 7 and up cost less each than packages 3 to 6.
// It exists because the cost of a delivery is the trip, not the bag: a vehicle carrying one package costs very nearly what the same vehicle carrying six costs.
// A flat per-package rate over-charges exactly the large B2B order the business depends on, so the schedule has to descend.
//
// Two rates therefore have to hold one invariant, at every zone:
//
//     tier two < tier one
//
// The locked schedule in docs/business/BusinessModel.md descends steeply, from 700 naira to 400 for Kaduna South and 1,000 to 600 for Chikun.
// We run a shallower version of the same shape, mapped into a narrower operating band, until a second delivery cost measurement lands.
//
// The mapping is linear, so it preserves both the descent within a zone and the ordering between zones.
// Nothing is clamped: clamping collapsed Chikun's two rates onto the same number and produced a flat schedule, which is the defect this is here to avoid.

/** Lowest and highest per-package rate in the locked schedule, in kobo. */
export const LOCKED_TAPER_MIN_KOBO = 40_000;
export const LOCKED_TAPER_MAX_KOBO = 100_000;

/*
 * The band the locked schedule is mapped onto.
 * These two numbers are the only control, and reverting is one edit:
 *
 *   locked   BAND_MIN = LOCKED_TAPER_MIN_KOBO, BAND_MAX = LOCKED_TAPER_MAX_KOBO
 *   current  BAND_MIN = 50_000,                BAND_MAX =  60_000
 *   flat     BAND_MIN = 50_000,                BAND_MAX =  50_000
 *
 * Setting the band to the locked range makes intoTaperBand the identity function and restores the locked schedule exactly.
 * Setting both endpoints equal removes the taper.
 * Nothing else changes in either direction, and the locked figures stay above so the derivation is never lost.
 *
 * Zone rates live in the database and are set from this same mapping by migration 0024, so the fallbacks here and the rows there cannot disagree.
 */
export const TAPER_BAND_MIN_KOBO = 50_000;
export const TAPER_BAND_MAX_KOBO = 60_000;

/**
 * Maps a locked per-package rate into the operating band, rounded to the nearest 500 kobo so the resulting naira figures stay legible on an invoice.
 *
 * Order-preserving, so a rate that was higher than another before the mapping is still higher after it.
 * That is what keeps the taper a taper.
 */
export function intoTaperBand(lockedKobo: number): number {
  const lockedSpan = LOCKED_TAPER_MAX_KOBO - LOCKED_TAPER_MIN_KOBO;
  if (lockedSpan === 0) return TAPER_BAND_MIN_KOBO;

  const position = (lockedKobo - LOCKED_TAPER_MIN_KOBO) / lockedSpan;
  const mapped =
    TAPER_BAND_MIN_KOBO +
    position * (TAPER_BAND_MAX_KOBO - TAPER_BAND_MIN_KOBO);

  return Math.round(mapped / 500) * 500;
}

/** The locked Kaduna South rates, before the band is applied. */
export const LOCKED_TIER_ONE_PER_PACKAGE_KOBO = 70_000;
export const LOCKED_TIER_TWO_PER_PACKAGE_KOBO = 40_000;

/** Charged per package for packages 3 to 6, in kobo. */
export const TIER_ONE_PER_PACKAGE_KOBO = intoTaperBand(
  LOCKED_TIER_ONE_PER_PACKAGE_KOBO,
);

/** Charged per package for package 7 and beyond, in kobo. */
export const TIER_TWO_PER_PACKAGE_KOBO = intoTaperBand(
  LOCKED_TIER_TWO_PER_PACKAGE_KOBO,
);

/**
 * Fallback ceiling, as headroom above the zone base, for a zone that carries no explicit cap of its own.
 *
 * The cap deliberately loses money on very large drops.
 * That is what the individual-quote threshold below exists to catch.
 */
export const DELIVERY_CAP_OVER_BASE_KOBO = 600_000;

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
 * Above these, the tapered table stops recovering the vehicle: a 35-package drop needs a truck, and the cap gives up more than the goods margin covers.
 * Flagged rather than blocked, so an admin quotes it instead of checkout silently selling below cost.
 */

/** Package count above which the order should be quoted individually. */
export const INDIVIDUAL_QUOTE_PACKAGE_THRESHOLD = 20;

/** Items subtotal above which the order should be quoted individually, in kobo. */
export const INDIVIDUAL_QUOTE_SUBTOTAL_KOBO = 75_000_000;

/*
 * `zoneFeeKobo` is the delivery zone's base fee, in kobo.
 * `packageCount` is every line's quantity summed, and `freeDelivery` is set while a free-delivery promotion is running.
 * `tierOnePerPackageKobo` (packages 3 to 6), `tierTwoPerPackageKobo` (package 7 and beyond) and `deliveryCapKobo` (the zone's absolute ceiling) are the zone's own taper and ceiling.
 * Each falls back to the Kaduna South figure when absent, so a zone row written before these columns existed still prices exactly as it did.
 */
export interface DeliveryFeeInput {
  zoneFeeKobo: number;
  packageCount: number;
  freeDelivery?: boolean;
  tierOnePerPackageKobo?: number;
  tierTwoPerPackageKobo?: number;
  deliveryCapKobo?: number;
}

/*
 * `capped` is true when the taper was trimmed by the per-drop ceiling.
 * `deliveryFeeKobo` is what the buyer is actually charged, after any promotion.
 * `deliveryFeeBeforePromoKobo` is what it would have cost without one, for "was/now" copy.
 */
export interface DeliveryFeeBreakdown {
  zoneFeeKobo: number;
  extraPackages: number;
  extraPackagesKobo: number;
  capped: boolean;
  deliveryFeeKobo: number;
  deliveryFeeBeforePromoKobo: number;
  freeDelivery: boolean;
}

export function computeDeliveryFee(
  input: DeliveryFeeInput,
): DeliveryFeeBreakdown {
  const {
    zoneFeeKobo,
    packageCount,
    freeDelivery = false,
    tierOnePerPackageKobo = TIER_ONE_PER_PACKAGE_KOBO,
    tierTwoPerPackageKobo = TIER_TWO_PER_PACKAGE_KOBO,
    deliveryCapKobo,
  } = input;

  const extraPackages = Math.max(0, packageCount - PACKAGES_INCLUDED_IN_BASE);
  const tierOnePackages = Math.min(extraPackages, TIER_ONE_PACKAGE_COUNT);
  const tierTwoPackages = extraPackages - tierOnePackages;

  const uncappedExtras =
    tierOnePackages * tierOnePerPackageKobo +
    tierTwoPackages * tierTwoPerPackageKobo;

  const capKobo = deliveryCapKobo ?? zoneFeeKobo + DELIVERY_CAP_OVER_BASE_KOBO;
  const beforePromo = Math.min(zoneFeeKobo + uncappedExtras, capKobo);
  const capped = zoneFeeKobo + uncappedExtras > capKobo;

  // The full price is still computed during a promo so the UI can show it struck through next to FREE.
  return {
    zoneFeeKobo,
    extraPackages,
    extraPackagesKobo: beforePromo - zoneFeeKobo,
    capped,
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
 * `requiresIndividualQuote` is true when this order is past the tapered table and needs a manual quote.
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
