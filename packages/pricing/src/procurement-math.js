"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYSTACK_CAP = exports.PAYSTACK_FLAT = exports.PAYSTACK_RATE = void 0;
exports.deliveryFee = deliveryFee;
exports.serviceFee = serviceFee;
exports.paystackFee = paystackFee;
exports.computeOrder = computeOrder;
exports.buyPriceForMargin = buyPriceForMargin;
exports.sellPriceForMargin = sellPriceForMargin;
// === Paid by Debridgers, not charged to the buyer
/*
 * Derived from the kobo figures in assumptions.ts rather than restated, so the
 * buying desk and the margin reports cannot disagree about what the gateway
 * takes. This module works in naira; those are kobo.
 */
const assumptions_1 = require("./assumptions");
/** Paystack local card: 1.5% + ₦100, capped. Verify on the dashboard. */
exports.PAYSTACK_RATE = assumptions_1.PAYSTACK_CARD_RATE;
exports.PAYSTACK_FLAT = assumptions_1.PAYSTACK_CARD_FLAT_KOBO / 100;
exports.PAYSTACK_CAP = assumptions_1.PAYSTACK_CARD_CAP_KOBO / 100;
// === Fees
function deliveryFee(zoneBase, packages, rules) {
  const extra = Math.max(0, packages - rules.packagesInBase);
  const tierOne = Math.min(extra, rules.tierOnePackages);
  const tierTwo = extra - tierOne;
  const uncapped =
    zoneBase +
    tierOne * rules.tierOnePerPackage +
    tierTwo * rules.tierTwoPerPackage;
  return Math.min(uncapped, zoneBase + rules.deliveryCapOverBase);
}
function serviceFee(itemsTotal, rules) {
  const raw = Math.round(itemsTotal * rules.serviceFeeRate);
  return Math.min(Math.max(raw, rules.serviceFeeMin), rules.serviceFeeMax);
}
function paystackFee(revenue) {
  return Math.min(
    Math.round(revenue * exports.PAYSTACK_RATE) + exports.PAYSTACK_FLAT,
    exports.PAYSTACK_CAP,
  );
}
// === The breakdown
function computeOrder(inputs, rules) {
  const {
    sellPrice,
    buyPrice,
    inboundHaulage,
    packages,
    zoneBase,
    dropsPerTrip,
    loadingPerPackage,
  } = inputs;
  const itemsTotal = sellPrice * packages;
  const delivery = deliveryFee(zoneBase, packages, rules);
  const service = serviceFee(itemsTotal, rules);
  const revenue = itemsTotal + delivery + service;
  const landedGoods = (buyPrice + inboundHaulage) * packages;
  const paystack = paystackFee(revenue);
  /* The trip is the cost, and it is shared across every drop it serves. */
  const vehicle = zoneBase / Math.max(1, dropsPerTrip);
  const loading = loadingPerPackage * packages;
  const totalCost = landedGoods + paystack + vehicle + loading;
  const contribution = revenue - totalCost;
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
function buyPriceForMargin(inputs, targetMargin, rules) {
  const withZero = computeOrder({ ...inputs, buyPrice: 0 }, rules);
  const allowedGoods =
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
function sellPriceForMargin(inputs, targetMargin, rules) {
  const marginAt = (sellPrice) =>
    computeOrder({ ...inputs, sellPrice }, rules).marginOnRevenue;
  let low = 1;
  let high = Math.max(1000, (inputs.buyPrice + 1) * 10);
  /* Widen until the target is bracketed, so an extreme input still resolves. */
  let guard = 0;
  while (marginAt(high) < targetMargin && guard < 40) {
    high *= 2;
    guard += 1;
  }
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (marginAt(mid) < targetMargin) low = mid;
    else high = mid;
  }
  return high;
}
//# sourceMappingURL=procurement-math.js.map
