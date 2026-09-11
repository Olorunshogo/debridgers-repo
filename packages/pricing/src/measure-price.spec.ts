import { describe, expect, it } from "vitest";
import {
  computeMeasurePriceKobo,
  measureQuantityViolation,
} from "./measure-price";

describe("measureQuantityViolation", () => {
  it("rejects a product with no measure ratio configured", () => {
    expect(measureQuantityViolation(0, 1)).toMatch(/no measure ratio/);
    expect(measureQuantityViolation(1, 1)).toMatch(/no measure ratio/);
  });

  it("rejects a non-integer or sub-1 measure quantity", () => {
    expect(measureQuantityViolation(10, 0)).toMatch(/whole number/);
    expect(measureQuantityViolation(10, 1.5)).toMatch(/whole number/);
  });

  it("rejects a quantity that reaches a full package", () => {
    expect(measureQuantityViolation(10, 10)).toMatch(/full package/);
    expect(measureQuantityViolation(10, 11)).toMatch(/full package/);
  });

  it("allows any quantity from 1 up to one short of a full package", () => {
    expect(measureQuantityViolation(10, 1)).toBeNull();
    expect(measureQuantityViolation(10, 9)).toBeNull();
  });
});

describe("computeMeasurePriceKobo", () => {
  it("prices a fraction of the package proportionally", () => {
    const packagePriceKobo = 5_000_00; // 50kg bag at 5,000 naira
    expect(
      computeMeasurePriceKobo({
        packagePriceKobo,
        measuresPerPackage: 50,
        measureQty: 1,
      }),
    ).toBe(10_000); // 1kg = 1/50th

    expect(
      computeMeasurePriceKobo({
        packagePriceKobo,
        measuresPerPackage: 50,
        measureQty: 10,
      }),
    ).toBe(100_000); // 10kg = 1/5th
  });

  it("rounds once on the line total, not per measure then multiplied", () => {
    /*
     * 100 kobo over 3 measures does not divide evenly. Rounding per-measure
     * first (33 kobo) and multiplying by a larger quantity would drift from
     * rounding the total once - this asserts the total-first contract holds.
     */
    const priced = computeMeasurePriceKobo({
      packagePriceKobo: 100,
      measuresPerPackage: 3,
      measureQty: 7,
    });
    expect(priced).toBe(Math.round((100 * 7) / 3));
  });
});
