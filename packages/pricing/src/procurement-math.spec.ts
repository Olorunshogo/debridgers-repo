import { describe, it, expect } from "vitest";
import {
  buyPriceForMargin,
  computeOrder,
  procurementTargets,
  sellPriceForMargin,
  type PricingRules,
} from "./procurement-math";
import { impliedLandedCostKobo, LOADING_50KG_KOBO } from "./assumptions";

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

// === procurementTargets, in kobo

/*
 * The same order as above, in kobo, with a zone whose taper is its own rather
 * than the served default. Kaduna South figures.
 */
const KOBO_CONTEXT = {
  packages: 1,
  zoneBaseKobo: 400_000,
  dropsPerTrip: 1,
  loadingPerPackageKobo: LOADING_50KG_KOBO.value,
  inboundHaulageKobo: 0,
  tierOnePerPackageKobo: 70_000,
  tierTwoPerPackageKobo: 40_000,
  deliveryCapKobo: 1_000_000,
  targetMarginPercent: 10,
};

describe("procurementTargets", () => {
  it("takes the margin as a percentage and divides it once", () => {
    const t = procurementTargets(
      { ...KOBO_CONTEXT, known: "marketPrice", marketPriceKobo: 9_800_000 },
      RULES,
    );
    expect(t.targetMargin).toBeCloseTo(0.1, 10);
  });

  it("agrees with the naira functions on the same order", () => {
    const t = procurementTargets(
      { ...KOBO_CONTEXT, known: "marketPrice", marketPriceKobo: 9_800_000 },
      RULES,
    );
    expect(t.deliveryFeeKobo).toBe(400_000);
    expect(t.serviceFeeKobo).toBe(294_000);
    expect(t.revenueKobo).toBe(10_494_000);
    /* Within a kobo of the naira path's ₦1,674, which rounds to the naira. */
    expect(Math.round(t.paystackKobo / 100)).toBe(1674);
    expect(Math.round(t.buyPriceKobo / 100)).toBe(88472);
  });

  it("prices a far zone at its own taper, not the near zone's", () => {
    const near = procurementTargets(
      { ...KOBO_CONTEXT, packages: 8, known: "farmerPrice", farmerPriceKobo: 9_000_000 },
      RULES,
    );
    const far = procurementTargets(
      {
        ...KOBO_CONTEXT,
        packages: 8,
        tierOnePerPackageKobo: 100_000,
        tierTwoPerPackageKobo: 60_000,
        known: "farmerPrice",
        farmerPriceKobo: 9_000_000,
      },
      RULES,
    );
    expect(far.deliveryFeeKobo).toBeGreaterThan(near.deliveryFeeKobo);
  });

  it("respects the zone's own ceiling", () => {
    const t = procurementTargets(
      {
        ...KOBO_CONTEXT,
        packages: 30,
        deliveryCapKobo: 500_000,
        known: "farmerPrice",
        farmerPriceKobo: 9_000_000,
      },
      RULES,
    );
    expect(t.deliveryFeeKobo).toBe(500_000);
  });

  it("carries the landed cost read path with its status", () => {
    const t = procurementTargets(
      { ...KOBO_CONTEXT, known: "marketPrice", marketPriceKobo: 9_800_000 },
      RULES,
    );
    expect(t.landedCost.value).toBe(impliedLandedCostKobo(9_800_000));
    expect(t.landedCost.status).toBe("unknown");
  });

  /*
   * The property that matters: whichever price was solved, feeding the solved
   * order back through the same arithmetic reproduces the margin that was
   * asked for. Rounding each price outward by a kobo can only move the margin
   * by about a ten-millionth, so the tolerance is well inside a kobo.
   */
  const CASES: Array<[number, number, number, number]> = [
    /* margin %, packages, drops per trip, price in kobo */
    [5, 1, 1, 9_800_000],
    [10, 1, 1, 9_800_000],
    [15, 4, 2, 4_500_000],
    [12, 9, 3, 2_800_000],
    [20, 20, 1, 12_000_000],
    [3, 2, 1, 1_500_000],
  ];

  it.each(CASES)(
    "reproduces a %i%% margin solving the buy price from the market price",
    (marginPercent, packages, dropsPerTrip, priceKobo) => {
      const t = procurementTargets(
        {
          ...KOBO_CONTEXT,
          targetMarginPercent: marginPercent,
          packages,
          dropsPerTrip,
          known: "marketPrice",
          marketPriceKobo: priceKobo,
        },
        RULES,
      );
      expect(t.solvedPriceKobo).toBe(t.buyPriceKobo);
      expect(t.marginOnRevenue).toBeCloseTo(marginPercent / 100, 5);
    },
  );

  it.each(CASES)(
    "reproduces a %i%% margin solving the sell price from the farmer price",
    (marginPercent, packages, dropsPerTrip, priceKobo) => {
      const t = procurementTargets(
        {
          ...KOBO_CONTEXT,
          targetMarginPercent: marginPercent,
          packages,
          dropsPerTrip,
          known: "farmerPrice",
          farmerPriceKobo: priceKobo,
        },
        RULES,
      );
      expect(t.solvedPriceKobo).toBe(t.sellPriceKobo);
      expect(t.marginOnRevenue).toBeCloseTo(marginPercent / 100, 5);
    },
  );

  it.each(CASES)(
    "round-trips a %i%% margin between the two directions",
    (marginPercent, packages, dropsPerTrip, priceKobo) => {
      const context = {
        ...KOBO_CONTEXT,
        targetMarginPercent: marginPercent,
        packages,
        dropsPerTrip,
      };

      const forward = procurementTargets(
        { ...context, known: "farmerPrice", farmerPriceKobo: priceKobo },
        RULES,
      );
      const back = procurementTargets(
        {
          ...context,
          known: "marketPrice",
          marketPriceKobo: forward.sellPriceKobo,
        },
        RULES,
      );

      /* Within a kobo per package: each direction rounds outward once. */
      expect(Math.abs(back.buyPriceKobo - priceKobo)).toBeLessThanOrEqual(2);
    },
  );

  it("clamps a margin typed outside 0 to 100", () => {
    const over = procurementTargets(
      { ...KOBO_CONTEXT, targetMarginPercent: 900, known: "marketPrice", marketPriceKobo: 9_800_000 },
      RULES,
    );
    expect(over.targetMargin).toBe(1);

    const under = procurementTargets(
      { ...KOBO_CONTEXT, targetMarginPercent: -5, known: "marketPrice", marketPriceKobo: 9_800_000 },
      RULES,
    );
    expect(under.targetMargin).toBe(0);
  });

  it("reports the walk-away price above the sell price when fees carry the order", () => {
    const t = procurementTargets(
      { ...KOBO_CONTEXT, known: "marketPrice", marketPriceKobo: 9_800_000 },
      RULES,
    );
    expect(t.walkAwayPriceKobo).toBeGreaterThan(t.sellPriceKobo);
  });
});
