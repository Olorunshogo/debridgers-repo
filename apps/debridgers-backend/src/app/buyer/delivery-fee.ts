/*
 * Delivery fee computation - per package, not per kilo.
 *
 * What fills a vehicle is packages: a 50kg bag and a 25 litre keg each occupy
 * one slot. Pricing on mass would need density constants for oil and an average
 * tuber weight for yam, both of which are guesses, to answer a question the
 * driver settles by counting.
 *
 * It is also the version a buyer can verify at a glance:
 *   "₦1,000 to Kaduna South, plus ₦500 per extra bag."
 *
 * Pure functions with no database access, so the quote endpoint and the
 * checkout charge cannot drift apart - both call this - and so it stays
 * testable without a server.
 */

/** Packages included in the zone base fee before extras are charged. */
export const PACKAGES_INCLUDED_IN_BASE = 1;

/** Charged for each package beyond the included allowance, in kobo. */
export const PER_EXTRA_PACKAGE_KOBO = 50_000;

/** Flat order handling fee, in kobo. */
export const HANDLING_FEE_KOBO = 10_000;

export interface DeliveryFeeInput {
  /** Base fee for the delivery zone, in kobo. */
  zoneFeeKobo: number;
  /** Total packages in the basket - the sum of every line's quantity. */
  packageCount: number;
  /** Set while a free-delivery promotion is running. */
  freeDelivery?: boolean;
}

export interface DeliveryFeeBreakdown {
  zoneFeeKobo: number;
  extraPackages: number;
  extraPackagesKobo: number;
  /** What the buyer is actually charged, after any promotion. */
  deliveryFeeKobo: number;
  /** What it would have cost without the promotion, for "was/now" copy. */
  deliveryFeeBeforePromoKobo: number;
  freeDelivery: boolean;
}

export function computeDeliveryFee(
  input: DeliveryFeeInput,
): DeliveryFeeBreakdown {
  const { zoneFeeKobo, packageCount, freeDelivery = false } = input;

  const extraPackages = Math.max(0, packageCount - PACKAGES_INCLUDED_IN_BASE);
  const extraPackagesKobo = extraPackages * PER_EXTRA_PACKAGE_KOBO;
  const beforePromo = zoneFeeKobo + extraPackagesKobo;

  return {
    zoneFeeKobo,
    extraPackages,
    extraPackagesKobo,
    /* The full price is still computed during a promo so the UI can show it
       struck through next to FREE. */
    deliveryFeeKobo: freeDelivery ? 0 : beforePromo,
    deliveryFeeBeforePromoKobo: beforePromo,
    freeDelivery,
  };
}

export interface OrderTotals extends DeliveryFeeBreakdown {
  itemsTotalKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
}

export function computeOrderTotals(
  itemsTotalKobo: number,
  fee: DeliveryFeeBreakdown,
): OrderTotals {
  return {
    ...fee,
    itemsTotalKobo,
    handlingFeeKobo: HANDLING_FEE_KOBO,
    totalKobo: itemsTotalKobo + fee.deliveryFeeKobo + HANDLING_FEE_KOBO,
  };
}
