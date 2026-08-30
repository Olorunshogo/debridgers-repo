/** Paystack local card: 1.5% + ₦100, capped. Verify on the dashboard. */
export declare const PAYSTACK_RATE = 0.015;
export declare const PAYSTACK_FLAT: number;
export declare const PAYSTACK_CAP: number;
/**
 * The fee rules, in naira, as served by GET /config/public.
 *
 * The API serves kobo; whoever fetches it converts once, so nothing downstream
 * has to remember which unit it holds.
 */
export interface PricingRules {
  serviceFeeRate: number;
  serviceFeeMin: number;
  serviceFeeMax: number;
  packagesInBase: number;
  tierOnePackages: number;
  tierOnePerPackage: number;
  tierTwoPerPackage: number;
  deliveryCapOverBase: number;
  minimumOrder: number;
  minimumOrderPackages: number;
}
export interface OrderInputs {
  /** What the buyer pays for one package of goods, before any fee. */
  sellPrice: number;
  /** What Debridgers pays the supplier for one package. */
  buyPrice: number;
  /** Supplier to warehouse, per package. Part of landed cost, not delivery. */
  inboundHaulage: number;
  packages: number;
  /** Zone base fee, which is also the cost of one dedicated trip. */
  zoneBase: number;
  /** Deliveries sharing one vehicle. The trip cost divides by this. */
  dropsPerTrip: number;
  /** Loading and offloading, per package. ₦300 for 50kg, ₦500 for 100kg. */
  loadingPerPackage: number;
}
export interface OrderBreakdown {
  itemsTotal: number;
  deliveryFee: number;
  serviceFee: number;
  /** What the buyer pays in total. */
  revenue: number;
  landedGoods: number;
  paystack: number;
  vehicle: number;
  loading: number;
  totalCost: number;
  contribution: number;
  /** Contribution as a share of what the buyer paid. */
  marginOnRevenue: number;
  /** How far below the sell price the goods were bought, as a share. */
  procurementSpread: number;
}
export declare function deliveryFee(
  zoneBase: number,
  packages: number,
  rules: PricingRules,
): number;
export declare function serviceFee(
  itemsTotal: number,
  rules: PricingRules,
): number;
export declare function paystackFee(revenue: number): number;
export declare function computeOrder(
  inputs: OrderInputs,
  rules: PricingRules,
): OrderBreakdown;
/**
 * Highest price payable per package to hit a target margin at a known sell
 * price. Direct, because revenue does not depend on what we paid.
 *
 * A result above the sell price means the fees alone carry the order: the goods
 * can be bought at market and the order still hits target.
 */
export declare function buyPriceForMargin(
  inputs: Omit<OrderInputs, "buyPrice">,
  targetMargin: number,
  rules: PricingRules,
): number;
/**
 * Lowest sell price per package that hits a target margin at a known buy price.
 *
 * Solved by bisection rather than algebra because the service fee and the
 * delivery and Paystack caps make revenue piecewise in the sell price, and a
 * closed form would silently mislead wherever a cap binds.
 */
export declare function sellPriceForMargin(
  inputs: Omit<OrderInputs, "sellPrice">,
  targetMargin: number,
  rules: PricingRules,
): number;
//# sourceMappingURL=procurement-math.d.ts.map
