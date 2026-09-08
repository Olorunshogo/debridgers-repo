import { describe, it, expect } from "vitest";
import {
  computeDeliveryFee,
  computeOrderTotals,
  computeServiceFee,
  DELIVERY_CAP_OVER_BASE_KOBO,
  MINIMUM_ORDER_KOBO,
  MINIMUM_ORDER_PACKAGES,
  PACKAGES_INCLUDED_IN_BASE,
  SERVICE_FEE_MAX_KOBO,
  SERVICE_FEE_MIN_KOBO,
  SERVICE_FEE_RATE,
  TIER_ONE_PACKAGE_COUNT,
  TIER_ONE_PER_PACKAGE_KOBO,
  TIER_TWO_PER_PACKAGE_KOBO,
  intoTaperBand,
} from "@debridgers/pricing";
import { remitPerPackageKobo } from "../agent/agent-commission";

/*
 * Taper expectations are written against the locked schedule and mapped through
 * the band, exactly as the seeder and migration 0024 do. Writing the banded
 * figures literally would mean a band change silently needs three separate
 * edits, and the derivation would stop being visible in the assertion.
 */
const taper = (lockedNaira: number): number => intoTaperBand(lockedNaira * 100);

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

const KADUNA_SOUTH = naira(4000);
const KADUNA_NORTH = naira(4500);
const CHIKUN = naira(6000);

// Catalogue prices, per package.
// RICE is Local White Rice, 50kg bag.
// BEANS is Wake Gida (Honey Beans), 100kg bag.
// PALM_OIL is Palm Oil, 25 litre keg.
const RICE = naira(42000);
const BEANS = naira(55000);
const PALM_OIL = naira(28000);

describe("delivery fee", () => {
  it("charges the zone base alone for one or two packages", () => {
    expect(
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 1 })
        .deliveryFeeKobo,
    ).toBe(naira(4000));

    expect(
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 2 })
        .deliveryFeeKobo,
    ).toBe(naira(4000));
  });

  it("tapers: packages 3 to 6 at tier one, then tier two beyond", () => {
    // 3 packages: base + one at tier one.
    expect(
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 3 })
        .deliveryFeeKobo,
    ).toBe(KADUNA_SOUTH + taper(700));

    // 8 packages: base + 4 at tier one + 2 at tier two. Worked example E.
    expect(
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 8 })
        .deliveryFeeKobo,
    ).toBe(KADUNA_SOUTH + 4 * taper(700) + 2 * taper(400));
  });

  it("prices the trip, not the bag: the sixth package costs less than the third", () => {
    const at5 = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 5,
    }).deliveryFeeKobo;
    const at6 = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 6,
    }).deliveryFeeKobo;
    const at7 = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 7,
    }).deliveryFeeKobo;

    expect(at6 - at5).toBe(taper(700));
    expect(at7 - at6).toBe(taper(400));

    /* The taper's whole point: the marginal package gets cheaper. */
    expect(at7 - at6).toBeLessThan(at6 - at5);
  });

  it("caps the fee at ₦6,000 above the zone base", () => {
    // 35 packages: uncapped taper would be ₦18,400. Worked example F.
    const fee = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 35,
    });

    expect(fee.deliveryFeeKobo).toBe(naira(10000));
    expect(fee.capped).toBe(true);
  });

  it("scales the cap with the zone, so distance is not given away", () => {
    expect(
      computeDeliveryFee({ zoneFeeKobo: CHIKUN, packageCount: 35 })
        .deliveryFeeKobo,
    ).toBe(naira(12000));

    expect(
      computeDeliveryFee({ zoneFeeKobo: KADUNA_NORTH, packageCount: 35 })
        .deliveryFeeKobo,
    ).toBe(naira(10500));
  });

  it("still computes the full price during a promo, for struck-through copy", () => {
    const fee = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 3,
      freeDelivery: true,
    });

    expect(fee.deliveryFeeKobo).toBe(0);
    expect(fee.deliveryFeeBeforePromoKobo).toBe(KADUNA_SOUTH + taper(700));
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
    const fee = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 1,
    });
    const totals = computeOrderTotals(RICE, fee, 1);

    expect(totals.deliveryFeeKobo).toBe(naira(4000));
    expect(totals.serviceFeeKobo).toBe(naira(1260));
    expect(totals.totalKobo).toBe(naira(47260));
    expect(totals.requiresIndividualQuote).toBe(false);
  });

  it("prices worked example E: 8-package restaurant order", () => {
    const items = 5 * RICE + 2 * PALM_OIL + BEANS;
    expect(items).toBe(naira(321000));

    const fee = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 8,
    });
    const totals = computeOrderTotals(items, fee, 8);

    const expectedDelivery: number =
      KADUNA_SOUTH + 4 * taper(700) + 2 * taper(400);

    expect(totals.deliveryFeeKobo).toBe(expectedDelivery);
    expect(totals.serviceFeeKobo).toBe(naira(5000));
    expect(totals.totalKobo).toBe(items + expectedDelivery + naira(5000));
    /* The cap gives up ₦4,630 here: 3% of ₦321,000 is ₦9,630. Deliberate. */
    expect(totals.requiresIndividualQuote).toBe(false);
  });

  it("flags orders past the tapered table for an individual quote", () => {
    const fee = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 35,
    });

    expect(
      computeOrderTotals(naira(1395000), fee, 35).requiresIndividualQuote,
    ).toBe(true);

    // Triggered by value alone, not only by package count.
    expect(
      computeOrderTotals(naira(800000), fee, 4).requiresIndividualQuote,
    ).toBe(true);
  });

  it("keeps handlingFeeKobo as an alias, so the orders table keeps working", () => {
    const fee = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 1,
    });
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
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 1 }),
      1,
    );
    expect(tooSmall.belowMinimumOrder).toBe(true);
    expect(tooSmall.minimumOrderShortfallKobo).toBe(naira(13000));

    /* Above the naira floor on one package: fine, and always was. */
    const oneKeg = computeOrderTotals(
      PALM_OIL,
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 1 }),
      1,
    );
    expect(oneKeg.belowMinimumOrder).toBe(false);
    expect(oneKeg.minimumOrderShortfallKobo).toBe(0);

    /* Two packages satisfies it even below the naira floor: the rule is OR. */
    const twoCheap = computeOrderTotals(
      naira(24000),
      computeDeliveryFee({ zoneFeeKobo: KADUNA_SOUTH, packageCount: 2 }),
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
  /*
   * The zone tapers, asserted against the locked table rather than against the
   * defaults. A single taper for every zone under-charged the far ones, and
   * these are what catch that returning.
   */
  const NORTH_TAPER = {
    tierOnePerPackageKobo: taper(800),
    tierTwoPerPackageKobo: taper(450),
    deliveryCapKobo: naira(11000),
  };

  const CHIKUN_TAPER = {
    tierOnePerPackageKobo: taper(1000),
    tierTwoPerPackageKobo: taper(600),
    deliveryCapKobo: naira(14000),
  };

  it("charges the far zone more per package than the near one", () => {
    const south = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 6,
    }).deliveryFeeKobo;

    const chikun = computeDeliveryFee({
      zoneFeeKobo: CHIKUN,
      packageCount: 6,
      ...CHIKUN_TAPER,
    }).deliveryFeeKobo;

    /* Four tier-one packages on each zone's own rate, over its own base. */
    expect(south).toBe(KADUNA_SOUTH + 4 * taper(700));
    expect(chikun).toBe(CHIKUN + 4 * taper(1000));

    /* The point of per-zone rates: the far zone costs more for the same load. */
    expect(chikun).toBeGreaterThan(south);
  });

  it("applies each zone's own ceiling rather than one shared headroom", () => {
    const north = computeDeliveryFee({
      zoneFeeKobo: KADUNA_NORTH,
      packageCount: 200,
      ...NORTH_TAPER,
    });

    const chikun = computeDeliveryFee({
      zoneFeeKobo: CHIKUN,
      packageCount: 200,
      ...CHIKUN_TAPER,
    });

    expect(north.deliveryFeeKobo).toBe(naira(11000));
    expect(chikun.deliveryFeeKobo).toBe(naira(14000));
    expect(north.capped).toBe(true);
    expect(chikun.capped).toBe(true);
  });

  it("falls back to the near-zone taper when a zone carries none", () => {
    const explicit = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 9,
      tierOnePerPackageKobo: TIER_ONE_PER_PACKAGE_KOBO,
      tierTwoPerPackageKobo: TIER_TWO_PER_PACKAGE_KOBO,
    });

    /* A zone row written before the taper columns existed must price exactly
       as it did, which is what makes the migration's defaults safe. */
    const implied = computeDeliveryFee({
      zoneFeeKobo: KADUNA_SOUTH,
      packageCount: 9,
    });

    expect(implied.deliveryFeeKobo).toBe(explicit.deliveryFeeKobo);
  });

  it("serves the pricing rules the charge actually uses", () => {
    expect(SERVICE_FEE_RATE).toBe(0.03);
    expect(SERVICE_FEE_MIN_KOBO).toBe(naira(500));
    expect(SERVICE_FEE_MAX_KOBO).toBe(naira(5000));
    expect(PACKAGES_INCLUDED_IN_BASE).toBe(2);
    expect(TIER_ONE_PACKAGE_COUNT).toBe(4);
    expect(TIER_ONE_PER_PACKAGE_KOBO).toBe(taper(700));
    expect(TIER_TWO_PER_PACKAGE_KOBO).toBe(taper(400));
    /* Flat or inverted has shipped before; the descent is the contract. */
    expect(TIER_TWO_PER_PACKAGE_KOBO).toBeLessThan(TIER_ONE_PER_PACKAGE_KOBO);
    expect(DELIVERY_CAP_OVER_BASE_KOBO).toBe(naira(6000));
    expect(MINIMUM_ORDER_KOBO).toBe(naira(25000));
    expect(MINIMUM_ORDER_PACKAGES).toBe(2);
  });
});
