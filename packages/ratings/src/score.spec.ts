import { describe, expect, it } from "vitest";
import {
  MIN_DISPLAY_COUNT,
  PRIOR_MEAN,
  isDisplayable,
  shrinkScore,
  tallyDistribution,
  weightedScore,
} from "./score";

// === Shrinkage

/*
 * The whole point of shrinkage is that a thin history stays close to the prior and a thick one overrides it.
 * Both directions have to hold, or a new agent's first 5-star rating would outrank an established one's real 4.8.
 */
describe("shrinkScore", () => {
  it("pulls a single rating close to the prior mean", () => {
    const score = shrinkScore(5, 1);
    expect(score).toBeCloseTo((10 * PRIOR_MEAN + 5) / 11, 5);
    expect(score).toBeLessThan(4.5);
  });

  it("lets a long, consistent history dominate the prior", () => {
    const score = shrinkScore(4.8 * 200, 200);
    expect(score).toBeGreaterThan(4.7);
  });
});

describe("isDisplayable", () => {
  it("hides an aggregate below the minimum count", () => {
    expect(isDisplayable(MIN_DISPLAY_COUNT - 1)).toBe(false);
    expect(isDisplayable(MIN_DISPLAY_COUNT)).toBe(true);
  });
});

describe("weightedScore", () => {
  it("leaves a full-weight rating untouched", () => {
    expect(weightedScore(5, 1.0)).toBe(5);
  });

  it("discounts a micro-context rating", () => {
    expect(weightedScore(5, 0.4)).toBeCloseTo(2, 5);
  });
});

describe("tallyDistribution", () => {
  it("buckets rounded scores into their star, ignoring out-of-range values", () => {
    expect(tallyDistribution([1, 1, 3, 5, 5, 5, 0, 6])).toEqual([
      2, 0, 1, 0, 3,
    ]);
  });
});
