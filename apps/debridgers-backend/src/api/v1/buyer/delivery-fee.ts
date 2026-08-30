/*
 * The API's view of order pricing.
 *
 * The rules themselves live in @debridgers/pricing, which the browser also
 * imports, so the quote, the checkout charge and the buying desk cannot drift
 * apart. Nothing here restates a number.
 *
 * This file exists for one reason: the shared package must not depend on Nest,
 * so the minimum-order rule reports a message there and is turned into an HTTP
 * error here.
 */

import { BadRequestException } from "@nestjs/common";
import { minimumOrderViolation } from "@debridgers/pricing";

export * from "@debridgers/pricing";

/**
 * Throws when a basket is too small to deliver at a positive contribution.
 *
 * Enforced on the quote as well as the charge, so the buyer is told why before
 * they reach payment rather than after.
 */
export function assertMeetsMinimumOrder(
  itemsTotalKobo: number,
  packageCount: number,
): void {
  const violation = minimumOrderViolation(itemsTotalKobo, packageCount);

  if (violation) {
    throw new BadRequestException(violation);
  }
}
