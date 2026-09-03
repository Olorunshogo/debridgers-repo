import { describe, expect, it } from "vitest";
import {
  intoTaperBand,
  LOCKED_TAPER_MAX_KOBO,
  LOCKED_TAPER_MIN_KOBO,
  LOCKED_TIER_ONE_PER_PACKAGE_KOBO,
  LOCKED_TIER_TWO_PER_PACKAGE_KOBO,
  MINIMUM_ORDER_KOBO,
  TIER_ONE_PER_PACKAGE_KOBO,
  TIER_TWO_PER_PACKAGE_KOBO,
  minimumOrderViolation,
} from "./delivery-fee";

const naira = (n: number): number => n * 100;

// === The taper

/*
 * The taper's whole point is that the marginal package gets cheaper, because
 * the cost is the trip and not the bag. A schedule where the two rates are
 * equal is flat, and one where tier two is higher is inverted. Both have
 * shipped before, so both are asserted against here rather than assumed.
 */
describe("the delivery taper", () => {
  const lockedZoneRates: ReadonlyArray<readonly [string, number, number]> = [
    ["Kaduna South", 70_000, 40_000],
    ["Kaduna North", 80_000, 45_000],
    ["Chikun", 100_000, 60_000],
  ];

  it("descends at every zone once mapped into the band", () => {
    for (const [zone, lockedOne, lockedTwo] of lockedZoneRates) {
      const tierOne: number = intoTaperBand(lockedOne);
      const tierTwo: number = intoTaperBand(lockedTwo);

      expect(tierTwo, `${zone} tier two must be below tier one`).toBeLessThan(
        tierOne,
      );
    }
  });

  it("keeps the far zones dearer than the near ones", () => {
    const [south, north, chikun] = lockedZoneRates.map(([, one]) =>
      intoTaperBand(one),
    );

    expect(south).toBeLessThanOrEqual(north);
    expect(north).toBeLessThanOrEqual(chikun);
  });

  it("holds every rate inside the operating band", () => {
    for (const [, lockedOne, lockedTwo] of lockedZoneRates) {
      for (const rate of [intoTaperBand(lockedOne), intoTaperBand(lockedTwo)]) {
        expect(rate).toBeGreaterThanOrEqual(50_000);
        expect(rate).toBeLessThanOrEqual(60_000);
      }
    }
  });

  /*
   * The revert contract. Widening the band back to the locked range must be the
   * only edit needed, so the mapping has to be the identity there.
   */
  it("is the identity when the band is the locked range", () => {
    const identity = (kobo: number): number => {
      const span = LOCKED_TAPER_MAX_KOBO - LOCKED_TAPER_MIN_KOBO;
      const position = (kobo - LOCKED_TAPER_MIN_KOBO) / span;
      const mapped = LOCKED_TAPER_MIN_KOBO + position * span;
      return Math.round(mapped / 500) * 500;
    };

    for (const [, lockedOne, lockedTwo] of lockedZoneRates) {
      expect(identity(lockedOne)).toBe(lockedOne);
      expect(identity(lockedTwo)).toBe(lockedTwo);
    }
  });

  it("derives the exported fallbacks from the locked Kaduna South rates", () => {
    expect(TIER_ONE_PER_PACKAGE_KOBO).toBe(
      intoTaperBand(LOCKED_TIER_ONE_PER_PACKAGE_KOBO),
    );
    expect(TIER_TWO_PER_PACKAGE_KOBO).toBe(
      intoTaperBand(LOCKED_TIER_TWO_PER_PACKAGE_KOBO),
    );
  });
});

// === Minimum order

/*
 * The rule is "25,000 naira OR 2 packages", so an order is refused only when it
 * fails both. The implementation reads as a bug against a careless reading of
 * that sentence, and has nearly been "fixed" into one, hence this test.
 */
describe("minimumOrderViolation", () => {
  it("accepts one expensive package", () => {
    expect(minimumOrderViolation(naira(55_000), 1)).toBeNull();
  });

  it("accepts two cheap packages below the naira floor", () => {
    expect(minimumOrderViolation(naira(24_000), 2)).toBeNull();
  });

  it("refuses an order that is both too cheap and too small", () => {
    expect(minimumOrderViolation(naira(12_000), 1)).not.toBeNull();
  });

  it("accepts an order exactly on the naira floor", () => {
    expect(minimumOrderViolation(MINIMUM_ORDER_KOBO, 1)).toBeNull();
  });
});
