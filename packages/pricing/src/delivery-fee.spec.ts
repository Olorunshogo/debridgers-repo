import { describe, expect, it } from "vitest";
import {
  DISTANCE_BASE_FEE_KOBO,
  DISTANCE_RATE_PER_KM_KOBO,
  DISTANCE_ROUNDING_KOBO,
  MINIMUM_ORDER_KOBO,
  computeDeliveryFee,
  minimumOrderViolation,
} from "./delivery-fee";

const naira = (n: number): number => n * 100;

// === Distance-based delivery fee

describe("computeDeliveryFee", () => {
  it("charges the base fee at zero distance", () => {
    const fee = computeDeliveryFee({ distanceKm: 0 });
    expect(fee.deliveryFeeKobo).toBe(DISTANCE_BASE_FEE_KOBO);
  });

  it("adds the per-kilometre rate as distance grows", () => {
    const near = computeDeliveryFee({ distanceKm: 5 });
    const far = computeDeliveryFee({ distanceKm: 50 });
    expect(far.deliveryFeeKobo).toBeGreaterThan(near.deliveryFeeKobo);
  });

  it("floors the result to the nearest rounding unit", () => {
    const fee = computeDeliveryFee({ distanceKm: 5 });
    expect(fee.deliveryFeeKobo % DISTANCE_ROUNDING_KOBO).toBe(0);
  });

  it("matches the locked reference points", () => {
    // Narayi/High Cost - effectively zero distance from the warehouse.
    expect(computeDeliveryFee({ distanceKm: 2 }).deliveryFeeKobo).toBe(80_000);
    // Zaria, sourced at ~78km.
    expect(computeDeliveryFee({ distanceKm: 78 }).deliveryFeeKobo).toBe(
      460_000,
    );
    // Kachia, sourced at ~134km.
    expect(computeDeliveryFee({ distanceKm: 134 }).deliveryFeeKobo).toBe(
      740_000,
    );
  });

  it("zeroes the charge during a free-delivery promotion but keeps the pre-promo figure", () => {
    const fee = computeDeliveryFee({ distanceKm: 20, freeDelivery: true });
    expect(fee.deliveryFeeKobo).toBe(0);
    expect(fee.deliveryFeeBeforePromoKobo).toBeGreaterThan(0);
  });

  it("computes the rate from the exported constants, not a restated number", () => {
    const distanceKm = 33;
    const expected =
      Math.floor(
        (DISTANCE_BASE_FEE_KOBO + DISTANCE_RATE_PER_KM_KOBO * distanceKm) /
          DISTANCE_ROUNDING_KOBO,
      ) * DISTANCE_ROUNDING_KOBO;
    expect(computeDeliveryFee({ distanceKm }).deliveryFeeKobo).toBe(expected);
  });
});

// === Minimum order

/*
 * The rule is "25,000 naira OR 2 packages", so an order is refused only when it fails both.
 * The implementation reads as a bug against a careless reading of that sentence, and has nearly been "fixed" into one, hence this test.
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
