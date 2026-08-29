/*
 * Procurement arithmetic for the buying desk.
 *
 * Answers the two questions a buyer actually has, in both directions:
 *
 *   "Rice is ₦98,000 at market. What must I pay the farmer to hit 10%?"
 *   "The farmer wants ₦90,000. What must I sell at to hit 10%?"
 *
 * Every cost between those two numbers is named, so a price is never agreed
 * against a gut feel about whether it leaves room.
 *
 * The fee rules are passed in, never hardcoded here. They are served by
 * GET /config/public, which reads them from the same constants the checkout
 * charge uses, so this calculator cannot quote against rules the buyer is not
 * actually billed under. Restating them locally is precisely how a ₦1,400 unit
 * price outlived the product it described.
 *
 * Paystack's own rates are not part of that contract - they belong to the
 * gateway, not to Debridgers - so they stay here as documented constants to
 * verify against the dashboard.
 */

// === Paid by Debridgers, not charged to the buyer

/*
 * Derived from the kobo figures in assumptions.ts rather than restated, so the
 * buying desk and the margin reports cannot disagree about what the gateway
 * takes. This module works in naira; those are kobo.
 */
import {
  PAYSTACK_CARD_RATE,
  PAYSTACK_CARD_FLAT_KOBO,
  PAYSTACK_CARD_CAP_KOBO,
} from "./assumptions";

/** Paystack local card: 1.5% + ₦100, capped. Verify on the dashboard. */
export const PAYSTACK_RATE = PAYSTACK_CARD_RATE;
export const PAYSTACK_FLAT = PAYSTACK_CARD_FLAT_KOBO / 100;
export const PAYSTACK_CAP = PAYSTACK_CARD_CAP_KOBO / 100;

// === Types

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

// === Fees

export function deliveryFee(
  zoneBase: number,
  packages: number,
  rules: PricingRules,
): number {
  const extra: number = Math.max(0, packages - rules.packagesInBase);
  const tierOne: number = Math.min(extra, rules.tierOnePackages);
  const tierTwo: number = extra - tierOne;
  const uncapped: number =
    zoneBase +
    tierOne * rules.tierOnePerPackage +
    tierTwo * rules.tierTwoPerPackage;

  return Math.min(uncapped, zoneBase + rules.deliveryCapOverBase);
}

export function serviceFee(itemsTotal: number, rules: PricingRules): number {
  const raw: number = Math.round(itemsTotal * rules.serviceFeeRate);
  return Math.min(Math.max(raw, rules.serviceFeeMin), rules.serviceFeeMax);
}

export function paystackFee(revenue: number): number {
  return Math.min(
    Math.round(revenue * PAYSTACK_RATE) + PAYSTACK_FLAT,
    PAYSTACK_CAP,
  );
}

// === The breakdown

export function computeOrder(
  inputs: OrderInputs,
  rules: PricingRules,
): OrderBreakdown {
  const {
    sellPrice,
    buyPrice,
    inboundHaulage,
    packages,
    zoneBase,
    dropsPerTrip,
    loadingPerPackage,
  } = inputs;

  const itemsTotal: number = sellPrice * packages;
  const delivery: number = deliveryFee(zoneBase, packages, rules);
  const service: number = serviceFee(itemsTotal, rules);
  const revenue: number = itemsTotal + delivery + service;

  const landedGoods: number = (buyPrice + inboundHaulage) * packages;
  const paystack: number = paystackFee(revenue);
  /* The trip is the cost, and it is shared across every drop it serves. */
  const vehicle: number = zoneBase / Math.max(1, dropsPerTrip);
  const loading: number = loadingPerPackage * packages;

  const totalCost: number = landedGoods + paystack + vehicle + loading;
  const contribution: number = revenue - totalCost;

  return {
    itemsTotal,
    deliveryFee: delivery,
    serviceFee: service,
    revenue,
    landedGoods,
    paystack,
    vehicle,
    loading,
    totalCost,
    contribution,
    marginOnRevenue: revenue > 0 ? contribution / revenue : 0,
    procurementSpread: sellPrice > 0 ? (sellPrice - buyPrice) / sellPrice : 0,
  };
}

// === Solving backwards

/**
 * Highest price payable per package to hit a target margin at a known sell
 * price. Direct, because revenue does not depend on what we paid.
 *
 * A result above the sell price means the fees alone carry the order: the goods
 * can be bought at market and the order still hits target.
 */
export function buyPriceForMargin(
  inputs: Omit<OrderInputs, "buyPrice">,
  targetMargin: number,
  rules: PricingRules,
): number {
  const withZero: OrderBreakdown = computeOrder(
    { ...inputs, buyPrice: 0 },
    rules,
  );
  const allowedGoods: number =
    withZero.revenue * (1 - targetMargin) -
    withZero.paystack -
    withZero.vehicle -
    withZero.loading;

  return allowedGoods / inputs.packages - inputs.inboundHaulage;
}

/**
 * Lowest sell price per package that hits a target margin at a known buy price.
 *
 * Solved by bisection rather than algebra because the service fee and the
 * delivery and Paystack caps make revenue piecewise in the sell price, and a
 * closed form would silently mislead wherever a cap binds.
 */
export function sellPriceForMargin(
  inputs: Omit<OrderInputs, "sellPrice">,
  targetMargin: number,
  rules: PricingRules,
): number {
  const marginAt = (sellPrice: number): number =>
    computeOrder({ ...inputs, sellPrice }, rules).marginOnRevenue;

  let low: number = 1;
  let high: number = Math.max(1000, (inputs.buyPrice + 1) * 10);

  /* Widen until the target is bracketed, so an extreme input still resolves. */
  let guard: number = 0;
  while (marginAt(high) < targetMargin && guard < 40) {
    high *= 2;
    guard += 1;
  }

  for (let i = 0; i < 60; i += 1) {
    const mid: number = (low + high) / 2;
    if (marginAt(mid) < targetMargin) low = mid;
    else high = mid;
  }

  return high;
}
