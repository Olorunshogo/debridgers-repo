/** Packages covered by the zone base fee before extras are charged. */
export declare const PACKAGES_INCLUDED_IN_BASE = 2;
/** Packages charged at the first taper step, being packages 3 to 6. */
export declare const TIER_ONE_PACKAGE_COUNT = 4;
/** Charged per package for packages 3 to 6, in kobo. */
export declare const TIER_ONE_PER_PACKAGE_KOBO = 70000;
/** Charged per package for package 7 and beyond, in kobo. */
export declare const TIER_TWO_PER_PACKAGE_KOBO = 40000;
/**
 * Fallback ceiling, as headroom above the zone base, for a zone that carries no
 * explicit cap of its own.
 *
 * The cap deliberately loses money on very large drops. That is what the
 * individual-quote threshold below exists to catch.
 */
export declare const DELIVERY_CAP_OVER_BASE_KOBO = 600000;
/** Cost-to-serve rate, as a fraction of the items subtotal. */
export declare const SERVICE_FEE_RATE = 0.03;
/** Minimum cost-to-serve fee, in kobo. */
export declare const SERVICE_FEE_MIN_KOBO = 50000;
/** Maximum cost-to-serve fee, in kobo. */
export declare const SERVICE_FEE_MAX_KOBO = 500000;
/** Smallest items subtotal accepted for delivery, in kobo. */
export declare const MINIMUM_ORDER_KOBO = 2500000;
/** Smallest package count accepted for delivery. */
export declare const MINIMUM_ORDER_PACKAGES = 2;
/** Package count above which the order should be quoted individually. */
export declare const INDIVIDUAL_QUOTE_PACKAGE_THRESHOLD = 20;
/** Items subtotal above which the order should be quoted individually, in kobo. */
export declare const INDIVIDUAL_QUOTE_SUBTOTAL_KOBO = 75000000;
export interface DeliveryFeeInput {
  /** Base fee for the delivery zone, in kobo. */
  zoneFeeKobo: number;
  /** Total packages in the basket - the sum of every line's quantity. */
  packageCount: number;
  /** Set while a free-delivery promotion is running. */
  freeDelivery?: boolean;
  /** Charged per package for packages 3 to 6, in kobo. */
  tierOnePerPackageKobo?: number;
  /** Charged per package for package 7 and beyond, in kobo. */
  tierTwoPerPackageKobo?: number;
  /** Absolute ceiling on the delivery fee for this zone, in kobo. */
  deliveryCapKobo?: number;
}
export interface DeliveryFeeBreakdown {
  zoneFeeKobo: number;
  extraPackages: number;
  extraPackagesKobo: number;
  /** True when the taper was trimmed by the per-drop ceiling. */
  capped: boolean;
  /** What the buyer is actually charged, after any promotion. */
  deliveryFeeKobo: number;
  /** What it would have cost without the promotion, for "was/now" copy. */
  deliveryFeeBeforePromoKobo: number;
  freeDelivery: boolean;
}
export declare function computeDeliveryFee(
  input: DeliveryFeeInput,
): DeliveryFeeBreakdown;
/** Cost-to-serve fee for a basket: a rate on the goods, bounded both ways. */
export declare function computeServiceFee(itemsTotalKobo: number): number;
/**
 * Why a basket is too small to deliver at a positive contribution, or null when
 * it is large enough.
 *
 * Reports rather than throws, because this package is shared by the API and the
 * browser and must not depend on either one's error type. The API wraps this in
 * its own HTTP exception; the client renders the string.
 */
export declare function minimumOrderViolation(
  itemsTotalKobo: number,
  packageCount: number,
): string | null;
export interface OrderTotals extends DeliveryFeeBreakdown {
  itemsTotalKobo: number;
  /** The cost-to-serve fee. */
  serviceFeeKobo: number;
  /**
   * Same value as `serviceFeeKobo`, under the name the orders table still uses.
   * Kept so the DB column and every existing consumer keep working without a
   * migration; prefer `serviceFeeKobo` in new code.
   */
  handlingFeeKobo: number;
  /** True when this order is past the tapered table and needs a manual quote. */
  requiresIndividualQuote: boolean;
  totalKobo: number;
}
export declare function computeOrderTotals(
  itemsTotalKobo: number,
  fee: DeliveryFeeBreakdown,
  packageCount?: number,
): OrderTotals;
//# sourceMappingURL=delivery-fee.d.ts.map
