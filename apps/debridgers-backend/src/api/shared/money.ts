/*
 * All money in this system is an integer number of kobo. These are the only
 * sanctioned conversions between kobo and anything else.
 *
 * This module exists because the same unit ambiguity has now produced three
 * separate money bugs: a commission rate read as a fraction on one path and a
 * percentage on another, a refund credited in naira into a kobo balance, and a
 * transfer sent to Paystack a hundred times too small. Every one of them was a
 * number that looked correct and meant something else.
 */

// === Conversion

export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira)) {
    throw new Error(`nairaToKobo received a non-finite value: ${naira}`);
  }
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  assertKobo(kobo);
  return kobo / 100;
}

// === Formatting

/* Display only. Never feed the result of this back into a calculation. */
export function formatNaira(kobo: number): string {
  assertKobo(kobo);
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// === Arithmetic

/*
 * A percentage of a kobo amount, rounded to whole kobo. Integer in, integer
 * out, so a rate can never introduce a fraction of a kobo into a balance.
 *
 * `percent` is a percentage (5 means 5%), not a fraction. That is the same
 * convention the admin UI and the stored settings already use, and keeping one
 * convention everywhere is what stops the next unit bug.
 */
export function percentOfKobo(kobo: number, percent: number): number {
  assertKobo(kobo);

  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error(`percentOfKobo received an invalid percent: ${percent}`);
  }

  return Math.round((kobo * percent) / 100);
}

/*
 * Clamp to zero. Contribution can go negative when a product is sold below
 * cost, and a negative multiplied by a rate is how somebody quietly gets
 * credited for a loss.
 */
export function atLeastZero(kobo: number): number {
  return kobo < 0 ? 0 : kobo;
}

// === Outbound

/*
 * The amount for a Paystack request body.
 *
 * Paystack money fields are the currency's smallest unit - kobo for NGN - so
 * this is an assertion rather than a conversion. It exists because the call
 * sites disagreed: the buyer withdrawal passed kobo while both agent payout
 * paths divided by 100 first, which is the "hundred times too small" transfer
 * named at the top of this file. Routing every Paystack amount through one
 * function is what stops that returning.
 */
export function toPaystackAmount(kobo: number): number {
  assertKobo(kobo);
  if (kobo <= 0) {
    throw new Error(`Paystack amount must be positive, got ${kobo}`);
  }
  return kobo;
}

// === Guards

export function isKobo(value: unknown): value is number {
  return Number.isInteger(value);
}

export function assertKobo(value: number): void {
  if (!Number.isInteger(value)) {
    throw new Error(
      `Expected an integer number of kobo, got ${value}. Money must never be a float.`,
    );
  }
}
