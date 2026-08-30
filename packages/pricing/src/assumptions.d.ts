/**
 * How much weight a figure carries.
 *
 * `measured` came from a real invoice, a real trip, or a real query.
 * `estimated` is a considered guess with a stated basis.
 * `unknown` has no basis at all and is a placeholder to keep arithmetic running.
 */
export type MetricStatus = "measured" | "estimated" | "unknown";
export interface Metric<T = number> {
  value: T;
  status: MetricStatus;
  /** Where the figure came from, or what the guess rests on. */
  basis: string;
  /** ISO date the figure was measured. Absent while it is not. */
  measuredAt?: string;
  unit: string;
}
/** True when a figure is real rather than a placeholder. */
export declare function isMeasured(metric: Metric<unknown>): boolean;
/**
 * Every unmeasured metric in a set, so a report can carry its own health
 * warning instead of presenting estimates as findings.
 */
export declare function unmeasured(
  metrics: Record<string, Metric<unknown>>,
): string[];
/** Target procurement spread, as a fraction of the buyer price. */
export declare const TARGET_PROCUREMENT_SPREAD = 0.06;
/**
 * Landed cost per package, in kobo.
 *
 * Until a product is measured, its cost is implied from the target spread,
 * which means the margin it reports is the target rather than the truth. That
 * is the honest placeholder: it never claims a margin the business has not
 * proven.
 */
export declare const LANDED_COST_KOBO: Record<string, Metric>;
/** Implied landed cost for a product with no measurement, in kobo. */
export declare function impliedLandedCostKobo(buyerPriceKobo: number): number;
/**
 * Landed cost for a product: the measured figure when one exists, otherwise the
 * figure implied by the target spread.
 */
export declare function landedCostKobo(
  productName: string,
  buyerPriceKobo: number,
): Metric;
export declare const INBOUND_HAULAGE_KOBO: Metric;
export declare const LOADING_50KG_KOBO: Metric;
export declare const LOADING_100KG_KOBO: Metric;
export declare const MONTHLY_BURN_KOBO: Metric;
export declare const ORDER_ADMIN_MINUTES: Metric;
export declare const GMV_KOBO: Metric;
export declare const AVERAGE_ORDER_VALUE_KOBO: Metric;
export declare const WAREHOUSE_CAPACITY_KG: Metric;
export declare const WAREHOUSE_MONTHLY_COST_KOBO: Metric;
export declare const PAYSTACK_CARD_RATE = 0.015;
export declare const PAYSTACK_CARD_FLAT_KOBO = 10000;
export declare const PAYSTACK_CARD_CAP_KOBO = 200000;
/** What Paystack takes on a card transaction of this size, in kobo. */
export declare function paystackCardFeeKobo(amountKobo: number): number;
/** Everything above, for a report that wants to state its own confidence. */
export declare const OPERATING_METRICS: Record<string, Metric>;
//# sourceMappingURL=assumptions.d.ts.map
