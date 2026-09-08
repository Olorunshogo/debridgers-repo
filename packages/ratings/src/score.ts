/*
 * Score arithmetic - pure functions, no database access and no framework imports, so the backend's authoritative aggregate and the frontend's optimistic preview cannot drift apart, since both call this.
 *
 * The server always owns the number it persists.
 * A client may call `shrinkScore` to preview what a submission will do to an average before the server confirms it, but it never sends a computed score, only the raw per-target values a rater chose.
 * Otherwise the score is trivially gameable.
 */

// === Shrinkage

/** How many "phantom" ratings the prior is worth, before real ones dilute it. */
export const PRIOR_WEIGHT = 10;

/** The neutral starting point a target is assumed to sit at with no ratings yet. */
export const PRIOR_MEAN = 3.5;

/** Fewer ratings than this and an aggregate is not shown, only a "New" badge. */
export const MIN_DISPLAY_COUNT = 3;

/*
 * Bayesian shrinkage toward the prior.
 * Stops a single 5-star rating outranking an established target averaging a real 4.8, and stops a single 1-star rating sinking one with a long clean history.
 */
export function shrinkScore(sum: number, count: number): number {
  return (PRIOR_WEIGHT * PRIOR_MEAN + sum) / (PRIOR_WEIGHT + count);
}

/** Whether a target has enough ratings for its aggregate to mean anything. */
export function isDisplayable(count: number): boolean {
  return count >= MIN_DISPLAY_COUNT;
}

/** One decimal place, for every place a score is shown. */
export function formatScore(score: number): string {
  return score.toFixed(1);
}

// === Weighting

/*
 * A context's `weight` (see RatingContextConfig) discounts a micro rating relative to a considered one before it enters the sum that `shrinkScore` shrinks.
 * A weight of 1 leaves the raw score untouched.
 */
export function weightedScore(rawScore: number, contextWeight: number): number {
  return rawScore * contextWeight;
}

// === Distribution

export type ScoreDistribution = [number, number, number, number, number];

/** Tally of 1..5 star counts into the five buckets a distribution bar renders. */
export function tallyDistribution(scores: number[]): ScoreDistribution {
  const distribution: ScoreDistribution = [0, 0, 0, 0, 0];

  for (const score of scores) {
    const bucket = Math.round(score) - 1;
    if (bucket >= 0 && bucket < 5) {
      distribution[bucket] += 1;
    }
  }

  return distribution;
}
