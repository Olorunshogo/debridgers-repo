/*
 * Procurement arithmetic for the buying desk.
 *
 * Answers the two questions a buyer actually has, in both directions:
 *
 *   "Rice is ₦98,000 at market. What must I pay the farmer to hit 10%?"
 *   "The farmer wants ₦90,000. What must I sell at to hit 10%?"
 *
 * Every cost between those two numbers is named, so a price is never agreed against a gut feel about whether it leaves room.
 *
 * The fee rules are passed in, never hardcoded here.
 * They are served by GET /config/public, which reads them from the same constants the checkout charge uses, so this calculator cannot quote against rules the buyer is not actually billed under.
 * Restating them locally is precisely how a ₦1,400 unit price outlived the product it described.
 *
 * Paystack's own rates are not part of that contract: they belong to the gateway, not to Debridgers.
 * So they stay here as documented constants to verify against the dashboard.
 */

// === Paid by Debridgers, not charged to the buyer

/*
 * Derived from the kobo figures in assumptions.ts rather than restated, so the buying desk and the margin reports cannot disagree about what the gateway takes.
 * This module works in naira; those are kobo.
 */
import {
  PAYSTACK_CARD_RATE,
  PAYSTACK_CARD_FLAT_KOBO,
  PAYSTACK_CARD_CAP_KOBO,
  paystackCardFeeKobo,
  landedCostKobo,
  type Metric,
} from "./assumptions";

/** Paystack local card: 1.5% + ₦100, capped. Verify on the dashboard. */
export const PAYSTACK_RATE = PAYSTACK_CARD_RATE;
export const PAYSTACK_FLAT = PAYSTACK_CARD_FLAT_KOBO / 100;
export const PAYSTACK_CAP = PAYSTACK_CARD_CAP_KOBO / 100;

// === Types

/**
 * The fee rules, in naira, as served by GET /config/public.
 *
 * The API serves kobo; whoever fetches it converts once, so nothing downstream has to remember which unit it holds.
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

/*
 * `sellPrice` is what the buyer pays for one package of goods, before any fee.
 * `buyPrice` is what Debridgers pays the supplier for one package.
 * `inboundHaulage` is supplier to warehouse, per package, and is part of landed cost, not delivery.
 * `zoneBase` is the zone base fee, which is also the cost of one dedicated trip, and `dropsPerTrip` is how many deliveries share that vehicle, so the trip cost divides by it.
 * `loadingPerPackage` is loading and offloading per package: ₦300 for 50kg, ₦500 for 100kg.
 */
export interface OrderInputs {
  sellPrice: number;
  buyPrice: number;
  inboundHaulage: number;
  packages: number;
  zoneBase: number;
  dropsPerTrip: number;
  loadingPerPackage: number;
}

/*
 * `revenue` is what the buyer pays in total.
 * `marginOnRevenue` is contribution as a share of what the buyer paid, and `procurementSpread` is how far below the sell price the goods were bought, as a share.
 */
export interface OrderBreakdown {
  itemsTotal: number;
  deliveryFee: number;
  serviceFee: number;
  revenue: number;
  landedGoods: number;
  paystack: number;
  vehicle: number;
  loading: number;
  totalCost: number;
  contribution: number;
  marginOnRevenue: number;
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

/**
 * What the gateway takes on a transaction of this size.
 *
 * Passed in rather than fixed so the same arithmetic serves both the naira functions below and the kobo `procurementTargets` at the bottom of the file, each with the rounding its own unit demands.
 */
type PaystackFeeAt = (revenue: number) => number;

function orderBreakdown(
  inputs: OrderInputs,
  rules: PricingRules,
  paystackAt: PaystackFeeAt,
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
  const paystack: number = paystackAt(revenue);
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

export function computeOrder(
  inputs: OrderInputs,
  rules: PricingRules,
): OrderBreakdown {
  return orderBreakdown(inputs, rules, paystackFee);
}

// === Solving backwards

function solveBuyPrice(
  inputs: Omit<OrderInputs, "buyPrice">,
  targetMargin: number,
  rules: PricingRules,
  paystackAt: PaystackFeeAt,
): number {
  const withZero: OrderBreakdown = orderBreakdown(
    { ...inputs, buyPrice: 0 },
    rules,
    paystackAt,
  );
  const allowedGoods: number =
    withZero.revenue * (1 - targetMargin) -
    withZero.paystack -
    withZero.vehicle -
    withZero.loading;

  return allowedGoods / inputs.packages - inputs.inboundHaulage;
}

/*
 * Bisection, deliberately, and it must stay bisection.
 * The cost-to-serve fee and the delivery and Paystack caps make revenue piecewise in the sell price, so a closed form is only right until a cap binds, and then it is wrong without saying so.
 */
function solveSellPrice(
  inputs: Omit<OrderInputs, "sellPrice">,
  targetMargin: number,
  rules: PricingRules,
  paystackAt: PaystackFeeAt,
): number {
  const marginAt = (sellPrice: number): number =>
    orderBreakdown({ ...inputs, sellPrice }, rules, paystackAt).marginOnRevenue;

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

/**
 * Highest price payable per package to hit a target margin at a known sell price.
 * Direct, because revenue does not depend on what we paid.
 *
 * A result above the sell price means the fees alone carry the order: the goods can be bought at market and the order still hits target.
 */
export function buyPriceForMargin(
  inputs: Omit<OrderInputs, "buyPrice">,
  targetMargin: number,
  rules: PricingRules,
): number {
  return solveBuyPrice(inputs, targetMargin, rules, paystackFee);
}

/**
 * Lowest sell price per package that hits a target margin at a known buy price.
 *
 * Solved by bisection rather than algebra because the service fee and the delivery and Paystack caps make revenue piecewise in the sell price, and a closed form would silently mislead wherever a cap binds.
 */
export function sellPriceForMargin(
  inputs: Omit<OrderInputs, "sellPrice">,
  targetMargin: number,
  rules: PricingRules,
): number {
  return solveSellPrice(inputs, targetMargin, rules, paystackFee);
}

// === The buying desk, in kobo
//
// Everything above this line is in naira, and stays there: `PricingRules` is what PlatformConfigContext.toPricingRules already produces, and every existing caller reads it in naira.
// Rewriting the module's unit would mean rewriting that conversion too, so instead the kobo boundary is drawn here.
// Callers below hand over kobo, exactly like the rest of the platform, and the naira core is fed through one conversion inside `procurementTargets`.

/*
 * The order the targets are computed against, in kobo.
 *
 * The taper and the ceiling are the ZONE's own, not the defaults from GET /config/public.
 * Quoting a far zone at the near zone's rates is how the desk came to compute walk-away prices against a schedule checkout does not charge.
 *
 * `zoneBaseKobo` is the zone base fee, which is also the cost of one dedicated trip, and `dropsPerTrip` is how many deliveries share that vehicle, so the trip cost divides by it.
 * `loadingPerPackageKobo` (from assumptions.ts) and `inboundHaulageKobo` are loading/offloading and supplier-to-warehouse cost per package, both in kobo; the latter is part of landed cost.
 * `tierOnePerPackageKobo` and `tierTwoPerPackageKobo` are this zone's own per-package charge for packages 3 to 6 and package 7 onward, and `deliveryCapKobo` is this zone's absolute ceiling on one delivery fee.
 *
 * `targetMarginPercent` is a PERCENTAGE, as typed on the screen and as stored in system_settings.
 * It is divided to a fraction exactly once, inside.
 * No call site handles both forms, which is the ambiguity that has already produced a real bug.
 *
 * `productName` is the catalogue product name, to read a measured landed cost when one exists.
 */
export interface ProcurementContext {
  packages: number;
  zoneBaseKobo: number;
  dropsPerTrip: number;
  loadingPerPackageKobo: number;
  inboundHaulageKobo: number;
  tierOnePerPackageKobo: number;
  tierTwoPerPackageKobo: number;
  deliveryCapKobo: number;
  targetMarginPercent: number;
  productName?: string;
}

/**
 * Which of the two prices the desk actually knows.
 * The other is solved.
 *
 * One discriminated input rather than two functions, so both directions travel the same code path and two figures on one screen cannot be computed against different assumptions.
 */
export type ProcurementTargetsInput = ProcurementContext &
  (
    | { known: "marketPrice"; marketPriceKobo: number }
    | { known: "farmerPrice"; farmerPriceKobo: number }
  );

/*
 * `targetMargin` is the target margin as a fraction, divided down from the percentage once.
 * `sellPriceKobo` and `buyPriceKobo` are what the buyer pays and what we pay the supplier per package, each either given or solved; `solvedPriceKobo` is whichever of the two this call actually solved for, the other one was stated.
 * `walkAwayPriceKobo` is the price above which the order loses money.
 *
 * `landedCost` is what a package is modelled to cost landed: the measured figure where one exists, otherwise the figure implied by the target spread.
 * It carries its own status, so a target computed from a guess is visibly computed from a guess.
 *
 * `serviceFeeKobo` is the cost-to-serve fee and `revenueKobo` is what the buyer pays in total.
 * `marginOnRevenue` is contribution as a share of what the buyer paid, and `procurementSpread` is how far below the sell price the goods were bought, as a share.
 */
export interface ProcurementTargets {
  known: "marketPrice" | "farmerPrice";
  targetMargin: number;
  sellPriceKobo: number;
  buyPriceKobo: number;
  solvedPriceKobo: number;
  walkAwayPriceKobo: number;
  landedCost: Metric;
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  revenueKobo: number;
  landedGoodsKobo: number;
  paystackKobo: number;
  vehicleKobo: number;
  loadingKobo: number;
  totalCostKobo: number;
  contributionKobo: number;
  marginOnRevenue: number;
  procurementSpread: number;
}

/*
 * The one place a percentage becomes a fraction, mirroring SystemSettingsService.getPercentAsFraction on the server.
 * Out of range is clamped rather than trusted: a margin of 900% would solve to a sell price nothing could be bought at, and silently.
 */
function marginFraction(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100) / 100;
}

/*
 * The naira fee rules, restated in kobo, with the zone's own taper and ceiling in place of the served defaults.
 * Nothing new is invented here: every figure is either the served rule scaled by 100 or the zone's own row.
 */
function toKoboRules(
  rules: PricingRules,
  context: ProcurementContext,
): PricingRules {
  const kobo = (naira: number): number => Math.round(naira * 100);

  return {
    serviceFeeRate: rules.serviceFeeRate,
    serviceFeeMin: kobo(rules.serviceFeeMin),
    serviceFeeMax: kobo(rules.serviceFeeMax),
    packagesInBase: rules.packagesInBase,
    tierOnePackages: rules.tierOnePackages,
    tierOnePerPackage: context.tierOnePerPackageKobo,
    tierTwoPerPackage: context.tierTwoPerPackageKobo,
    /* The zone carries an absolute ceiling; PricingRules holds headroom. */
    deliveryCapOverBase: Math.max(
      0,
      context.deliveryCapKobo - context.zoneBaseKobo,
    ),
    minimumOrder: kobo(rules.minimumOrder),
    minimumOrderPackages: rules.minimumOrderPackages,
  };
}

/**
 * Every figure the buying desk needs, from one call.
 *
 * State the cost and the target margin and the rest follows: the price to sell at or buy at, the walk-away price, the fees charged, the costs incurred and the contribution left.
 * Solving these through separate calls is what let two numbers on one screen disagree about their own assumptions.
 */
export function procurementTargets(
  input: ProcurementTargetsInput,
  rules: PricingRules,
): ProcurementTargets {
  const targetMargin: number = marginFraction(input.targetMarginPercent);
  const koboRules: PricingRules = toKoboRules(rules, input);

  const shared = {
    packages: input.packages,
    zoneBase: input.zoneBaseKobo,
    dropsPerTrip: input.dropsPerTrip,
    loadingPerPackage: input.loadingPerPackageKobo,
    inboundHaulage: input.inboundHaulageKobo,
  };

  /*
   * Round outward, not to nearest.
   * A target to buy at must be one we can still hit, and a target to sell at must still clear, so each rounds against us by at most a kobo.
   */
  const sellPriceKobo: number =
    input.known === "marketPrice"
      ? input.marketPriceKobo
      : Math.ceil(
          solveSellPrice(
            { ...shared, buyPrice: input.farmerPriceKobo },
            targetMargin,
            koboRules,
            paystackCardFeeKobo,
          ),
        );

  const buyPriceKobo: number =
    input.known === "farmerPrice"
      ? input.farmerPriceKobo
      : Math.floor(
          solveBuyPrice(
            { ...shared, sellPrice: input.marketPriceKobo },
            targetMargin,
            koboRules,
            paystackCardFeeKobo,
          ),
        );

  const walkAwayPriceKobo: number = Math.floor(
    solveBuyPrice(
      { ...shared, sellPrice: sellPriceKobo },
      0,
      koboRules,
      paystackCardFeeKobo,
    ),
  );

  /* Recomputed at the rounded prices, so what is shown is what was solved. */
  const order: OrderBreakdown = orderBreakdown(
    { ...shared, sellPrice: sellPriceKobo, buyPrice: buyPriceKobo },
    koboRules,
    paystackCardFeeKobo,
  );

  return {
    known: input.known,
    targetMargin,
    sellPriceKobo,
    buyPriceKobo,
    solvedPriceKobo:
      input.known === "marketPrice" ? buyPriceKobo : sellPriceKobo,
    walkAwayPriceKobo,
    landedCost: landedCostKobo(input.productName ?? "", sellPriceKobo),
    itemsTotalKobo: Math.round(order.itemsTotal),
    deliveryFeeKobo: Math.round(order.deliveryFee),
    serviceFeeKobo: Math.round(order.serviceFee),
    revenueKobo: Math.round(order.revenue),
    landedGoodsKobo: Math.round(order.landedGoods),
    paystackKobo: Math.round(order.paystack),
    /* A trip shared across drops divides into a fraction of a kobo. */
    vehicleKobo: Math.round(order.vehicle),
    loadingKobo: Math.round(order.loading),
    totalCostKobo: Math.round(order.totalCost),
    contributionKobo: Math.round(order.contribution),
    marginOnRevenue: order.marginOnRevenue,
    procurementSpread: order.procurementSpread,
  };
}
