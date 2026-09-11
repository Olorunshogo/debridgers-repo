/*
 * Some grain products additionally sell by a retail sub-package measure, such as a mudu of beans out of a 100kg bag.
 *
 * Only the package price is ever stored, on `product.price_kobo`.
 * A measure's price is always a fraction of it, computed here rather than stored separately, so the two can never disagree.
 *
 * Pure functions with no database access and no framework imports, matching the rest of this package, so the cart, the checkout charge and the order line all call this and cannot drift apart.
 */

// === Measure pricing

export interface MeasurePriceInput {
  packagePriceKobo: number;
  measuresPerPackage: number;
  measureQty: number;
}

/**
 * Why a measure quantity cannot be priced, or null when it can.
 *
 * Reports rather than throws, because this package is shared by the API and the browser and must not depend on either one's error type.
 *
 * A quantity at or above the full measure count is refused rather than priced: at that point the buyer wants a whole package, and pricing it as measures would let a fractional line quietly cost more than the package it came from.
 */
export function measureQuantityViolation(
  measuresPerPackage: number,
  measureQty: number,
): string | null {
  if (!Number.isInteger(measuresPerPackage) || measuresPerPackage < 2) {
    return "This product has no measure ratio configured.";
  }
  if (!Number.isInteger(measureQty) || measureQty < 1) {
    return "Measure quantity must be a whole number of at least 1.";
  }
  if (measureQty > measuresPerPackage - 1) {
    return `A single line tops out at ${measuresPerPackage - 1} measures; ${measuresPerPackage} or more is a full package.`;
  }
  return null;
}

/**
 * Rounds once on the line total, not per measure then multiplied, so kobo cannot drift across a large order.
 *
 * Callers validate with `measureQuantityViolation` first; this does not re-check.
 */
export function computeMeasurePriceKobo(input: MeasurePriceInput): number {
  const { packagePriceKobo, measuresPerPackage, measureQty } = input;
  return Math.round((packagePriceKobo * measureQty) / measuresPerPackage);
}
