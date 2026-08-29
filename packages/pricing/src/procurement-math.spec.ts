import { describe, it, expect } from "vitest";
import {
  buyPriceForMargin,
  computeOrder,
  sellPriceForMargin,
  type PricingRules,
} from "./procurement-math";

/*
 * The rules the API currently serves, in naira. Stated here rather than
 * imported so a change to the live fee structure fails these tests loudly
 * instead of silently re-baselining them.
 */
const RULES: PricingRules = {
  serviceFeeRate: 0.03,
  serviceFeeMin: 500,
  serviceFeeMax: 5000,
  packagesInBase: 2,
  tierOnePackages: 4,
  tierOnePerPackage: 700,
  tierTwoPerPackage: 400,
  deliveryCapOverBase: 6000,
  minimumOrder: 25000,
  minimumOrderPackages: 2,
};

const base = {
  packages: 1,
  zoneBase: 4000,
  dropsPerTrip: 1,
  loadingPerPackage: 300,
  inboundHaulage: 0,
};

describe("procurement math, ₦98,000 bag", () => {
  it("charges the fees we expect", () => {
    const o = computeOrder(
      { ...base, sellPrice: 98000, buyPrice: 88472 },
      RULES,
    );
    expect(o.serviceFee).toBe(2940);
    expect(o.deliveryFee).toBe(4000);
    expect(o.revenue).toBe(104940);
    expect(o.paystack).toBe(1674);
  });

  it("solves the walk-away price above the sell price", () => {
    expect(
      Math.round(buyPriceForMargin({ ...base, sellPrice: 98000 }, 0, RULES)),
    ).toBe(98966);
  });

  it("solves buy prices for target margins", () => {
    const t = (m: number) =>
      Math.round(buyPriceForMargin({ ...base, sellPrice: 98000 }, m, RULES));
    expect(t(0.05)).toBe(93719);
    expect(t(0.1)).toBe(88472);
    expect(t(0.15)).toBe(83225);
  });

  it("three drops per trip raises the payable price", () => {
    const t = Math.round(
      buyPriceForMargin(
        { ...base, dropsPerTrip: 3, sellPrice: 98000 },
        0.1,
        RULES,
      ),
    );
    expect(t).toBe(91139);
  });

  it("inverts: farmer price to required sell price", () => {
    /*
     * ₦99,677 rather than the ₦99,676 that continuous algebra gives. Paystack
     * rounds to the naira, so the margin is a step function near the solution
     * and the bisection returns the first price that actually clears the
     * target. A "sell at or above" figure must round that way.
     */
    const p = sellPriceForMargin({ ...base, buyPrice: 90000 }, 0.1, RULES);
    expect(Math.round(p)).toBe(99677);
    const back = computeOrder(
      { ...base, sellPrice: p, buyPrice: 90000 },
      RULES,
    );
    expect(back.marginOnRevenue).toBeCloseTo(0.1, 4);
  });

  it("round-trips in both directions", () => {
    const buy = buyPriceForMargin({ ...base, sellPrice: 98000 }, 0.12, RULES);
    const sell = sellPriceForMargin({ ...base, buyPrice: buy }, 0.12, RULES);
    expect(sell).toBeCloseTo(98000, 0);
  });
});
