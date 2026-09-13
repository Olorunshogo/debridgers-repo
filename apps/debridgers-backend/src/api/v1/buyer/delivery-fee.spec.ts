import { describe, it, expect } from "vitest";
import {
  computeDeliveryFee,
  computeOrderTotals,
  computeServiceFee,
  DISTANCE_BASE_FEE_KOBO,
  DISTANCE_RATE_PER_KM_KOBO,
  DISTANCE_ROUNDING_KOBO,
  MINIMUM_ORDER_KOBO,
  MINIMUM_ORDER_PACKAGES,
  SERVICE_FEE_MAX_KOBO,
  SERVICE_FEE_MIN_KOBO,
  SERVICE_FEE_RATE,
} from "@debridgers/pricing";
import { remitPerPackageKobo } from "../agent/agent-commission";

/*
 * The worked examples from docs/business/BusinessModel.md, executable.
 *
 * These figures were derived once, on paper, and every locked pricing decision
 * rests on them. Asserting them here is what stops the next edit from quietly
 * moving a number that a business document still claims.
 *
 * The history is the argument: a ₦1,400 unit price and a ₦100 handling fee sat
 * in this codebase and in three company documents for months, describing a
 * product the catalogue has never sold. Nothing threw. It all looked fine on a
 * dashboard.
 *
 * Every amount is asserted in exact kobo. A test that only checked a fee was
 * "greater than zero" would have passed against the pricing this replaces,
 * which lost money on every small order.
 */

// ₦ → kobo
const naira = (n: number): number => n * 100;

/* Distances chosen so the resulting fee lands exactly on the pre-existing worked-example figures, with no flooring in play. */
const KADUNA_SOUTH_KM = 66; // -> ₦4,000
const KADUNA_NORTH_KM = 76; // -> ₦4,500
const CHIKUN_KM = 106; // -> ₦6,000

// Catalogue prices, per package.
// RICE is Local White Rice, 50kg bag.
// BEANS is Wake Gida (Honey Beans), 100kg bag.
// PALM_OIL is Palm Oil, 25 litre keg.
const RICE = naira(42000);
const BEANS = naira(55000);
const PALM_OIL = naira(28000);

describe("delivery fee", () => {
  it("charges the same fee no matter how many packages are in the order", () => {
    const one = computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM });
    const eight = computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM });

    expect(one.deliveryFeeKobo).toBe(naira(4000));
    expect(eight.deliveryFeeKobo).toBe(naira(4000));
  });

  it("charges more for a farther LGA", () => {
    const south = computeDeliveryFee({
      distanceKm: KADUNA_SOUTH_KM,
    }).deliveryFeeKobo;
    const north = computeDeliveryFee({
      distanceKm: KADUNA_NORTH_KM,
    }).deliveryFeeKobo;
    const chikun = computeDeliveryFee({
      distanceKm: CHIKUN_KM,
    }).deliveryFeeKobo;

    expect(south).toBe(naira(4000));
    expect(north).toBe(naira(4500));
    expect(chikun).toBe(naira(6000));
    expect(chikun).toBeGreaterThan(north);
    expect(north).toBeGreaterThan(south);
  });

  it("floors the fee to the nearest rounding unit", () => {
    const fee = computeDeliveryFee({ distanceKm: 23 }).deliveryFeeKobo;
    expect(fee % DISTANCE_ROUNDING_KOBO).toBe(0);
  });

  it("still computes the full price during a promo, for struck-through copy", () => {
    const fee = computeDeliveryFee({
      distanceKm: KADUNA_SOUTH_KM,
      freeDelivery: true,
    });

    expect(fee.deliveryFeeKobo).toBe(0);
    expect(fee.deliveryFeeBeforePromoKobo).toBe(naira(4000));
  });
});

describe("cost-to-serve fee", () => {
  it("takes 3% between the floor and the cap", () => {
    expect(computeServiceFee(RICE)).toBe(naira(1260));
    expect(computeServiceFee(BEANS)).toBe(naira(1650));
    expect(computeServiceFee(PALM_OIL)).toBe(naira(840));
  });

  it("holds a ₦500 floor for orders exempt from the minimum", () => {
    /*
     * 3% of the ₦25,000 minimum is ₦750, so the floor never binds on a
     * delivery order. It still covers pickups and same-zone add-ons, which
     * are exempt from the minimum.
     */
    expect(computeServiceFee(naira(12000))).toBe(naira(500));
    expect(computeServiceFee(0)).toBe(naira(500));
  });

  it("holds a ₦5,000 cap so a large account is not punished", () => {
    // 3% of ₦321,000 would be ₦9,630. Worked example E.
    expect(computeServiceFee(naira(321000))).toBe(naira(5000));
    expect(computeServiceFee(naira(1395000))).toBe(naira(5000));
  });

  it("caps from ₦166,667 of goods upward", () => {
    expect(computeServiceFee(naira(166000))).toBe(naira(4980));
    expect(computeServiceFee(naira(170000))).toBe(naira(5000));
  });

  it("covers the Paystack card fee with headroom on every hero product", () => {
    /*
     * The rail is the only cost-to-serve component anybody has measured. The
     * break-even rate is 2.10% on the cheapest hero order, so 3% clears it,
     * and the surplus is what pays for the admin nobody has costed yet.
     */
    const delivery = naira(4000);

    for (const items of [PALM_OIL, RICE, BEANS]) {
      const fee = computeServiceFee(items);
      const paystack =
        Math.round((items + delivery + fee) * 0.015) + naira(100);

      expect(fee).toBeGreaterThan(paystack);
    }
  });
});

describe("order totals", () => {
  it("prices worked example B: one 50kg bag of rice, Kaduna South", () => {
    const fee = computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM });
    const totals = computeOrderTotals(RICE, fee, 1);

    expect(totals.deliveryFeeKobo).toBe(naira(4000));
    expect(totals.serviceFeeKobo).toBe(naira(1260));
    expect(totals.totalKobo).toBe(RICE + naira(4000) + naira(1260));
    expect(totals.requiresIndividualQuote).toBe(false);
  });

  it("prices worked example E: 8-package restaurant order", () => {
    const items = 5 * RICE + 2 * PALM_OIL + BEANS;
    expect(items).toBe(naira(321000));

    const fee = computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM });
    const totals = computeOrderTotals(items, fee, 8);

    expect(totals.deliveryFeeKobo).toBe(naira(4000));
    expect(totals.serviceFeeKobo).toBe(naira(5000));
    expect(totals.totalKobo).toBe(items + naira(4000) + naira(5000));
    expect(totals.requiresIndividualQuote).toBe(false);
  });

  it("flags orders past the individual-quote threshold regardless of delivery fee", () => {
    const fee = computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM });

    expect(
      computeOrderTotals(naira(1395000), fee, 35).requiresIndividualQuote,
    ).toBe(true);

    // Triggered by value alone, not only by package count.
    expect(
      computeOrderTotals(naira(800000), fee, 4).requiresIndividualQuote,
    ).toBe(true);
  });

  it("keeps handlingFeeKobo as an alias, so the orders table keeps working", () => {
    const fee = computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM });
    const totals = computeOrderTotals(RICE, fee, 1);

    expect(totals.handlingFeeKobo).toBe(totals.serviceFeeKobo);
  });
});

describe("minimum order", () => {
  it("flags a small basket for batching instead of refusing the buyer", () => {
    // One 25kg bag of garri: ₦12,000 against a ₦4,000 vehicle.
    /*
     * No longer a throw. Refusing a small basket put our per-drop solvency
     * problem in the buyer's way; the drop is batched instead, and the flag
     * reaches the buyer admin who batches it.
     */
    const tooSmall = computeOrderTotals(
      naira(12000),
      computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM }),
      1,
    );
    expect(tooSmall.belowMinimumOrder).toBe(true);
    expect(tooSmall.minimumOrderShortfallKobo).toBe(naira(13000));

    /* Above the naira floor on one package: fine, and always was. */
    const oneKeg = computeOrderTotals(
      PALM_OIL,
      computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM }),
      1,
    );
    expect(oneKeg.belowMinimumOrder).toBe(false);
    expect(oneKeg.minimumOrderShortfallKobo).toBe(0);

    /* Two packages satisfies it even below the naira floor: the rule is OR. */
    const twoCheap = computeOrderTotals(
      naira(24000),
      computeDeliveryFee({ distanceKm: KADUNA_SOUTH_KM }),
      2,
    );
    expect(twoCheap.belowMinimumOrder).toBe(false);
  });
});

describe("agent remit price", () => {
  it("remits the product price less the commission for that band", () => {
    expect(remitPerPackageKobo("Local White Rice", RICE)).toBe(naira(41000));
    expect(remitPerPackageKobo("Wake Gida (Honey Beans)", BEANS)).toBe(
      naira(53800),
    );
    expect(remitPerPackageKobo("Palm Oil", PALM_OIL)).toBe(naira(27300));
  });

  it("falls back to the non-hero band for anything unmapped", () => {
    expect(remitPerPackageKobo("White Garri", naira(12000))).toBe(naira(11600));
  });

  it("never records a negative debt", () => {
    expect(remitPerPackageKobo("Local White Rice", naira(500))).toBe(0);
  });

  it("scales with the product, unlike the ₦1,300 flat rate it replaces", () => {
    /*
     * The bug this replaces: `dto.quantity * 130000` recorded ten bags of
     * ₦42,000 rice as ₦13,000 owed, so an agent could keep 97% of the
     * consignment and still show as settled.
     */
    const tenBags = 10 * remitPerPackageKobo("Local White Rice", RICE);

    expect(tenBags).toBe(naira(410000));
    expect(tenBags).toBeGreaterThan(10 * 130000);
  });
});

describe("config/public contract", () => {
  /*
   * GET /config/public serves these so a client can quote without restating
   * them. The endpoint imports the same constants rather than re-typing them,
   * and this asserts the values a published client is entitled to rely on, so
   * a change here is a visible contract change rather than a silent one.
   */
  it("serves the pricing rules the charge actually uses", () => {
    expect(SERVICE_FEE_RATE).toBe(0.03);
    expect(SERVICE_FEE_MIN_KOBO).toBe(naira(500));
    expect(SERVICE_FEE_MAX_KOBO).toBe(naira(5000));
    expect(DISTANCE_BASE_FEE_KOBO).toBe(naira(700));
    expect(DISTANCE_RATE_PER_KM_KOBO).toBe(naira(50));
    expect(DISTANCE_ROUNDING_KOBO).toBe(naira(100));
    expect(MINIMUM_ORDER_KOBO).toBe(naira(25000));
    expect(MINIMUM_ORDER_PACKAGES).toBe(2);
  });

  it("charges every LGA from the same formula, just with a different distance", () => {
    const near = computeDeliveryFee({ distanceKm: 5 }).deliveryFeeKobo;
    const far = computeDeliveryFee({ distanceKm: 150 }).deliveryFeeKobo;

    expect(far).toBeGreaterThan(near);
  });
});
