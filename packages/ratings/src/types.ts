/*
 * The shapes a rating context is built from.
 *
 * Contexts are data, not components: one config-driven flow renders whichever context it is given, so a new trigger is a registry entry in `rating-contexts.ts`, never new UI.
 * This mirrors how `packages/pricing` keeps every rate in one importable place instead of restated per caller.
 */

// === Roles

export type RaterRole = "buyer" | "agent";

/*
 * "delivery" is not a person - it is the order's fulfilment experience: product quality, timeliness, rider conduct.
 * So a self-serve order (no agent involved) still has somewhere for the buyer's feedback to land.
 */
export type RatingTargetType = "agent" | "buyer" | "delivery";

export type RatingEffort = "major" | "micro";

// === Facets

export type FacetGroupKey = "agentService" | "buyerConduct" | "delivery";

/*
 * `version` is the catalogue version this facet was introduced under.
 * A submission stores the catalogue version it was captured with, so editing this list later never rewrites what a past rater was actually asked.
 */
export interface FacetDefinition {
  key: string;
  label: string;
  group: FacetGroupKey;
  version: number;
}

// === Contexts

export type RatingContextKey =
  | "ORDER_COMPLETED_BUYER_RATES_AGENT"
  | "ORDER_COMPLETED_BUYER_RATES_DELIVERY"
  | "ORDER_COMPLETED_AGENT_RATES_BUYER";

export interface RatingTargetSpec {
  type: RatingTargetType;
  facetGroup: FacetGroupKey;
  label: string;
}

/*
 * `requiresAgent` is true when this context only makes sense for an order that actually had an agent attached.
 * The trigger reads the order's own `agent_id`/`order_source` snapshot and skips the context entirely when it is false, so a self-serve order never surfaces a "rate your agent" step.
 *
 * `weight` is the contribution to the target's aggregate.
 * Major contexts count in full; micro ones (a single quick tap) count for less, so a one-tap rating never outweighs a considered one.
 *
 * `windowDays` is how many days the request stays open, and the submitted rating stays editable.
 */
export interface RatingContextConfig {
  key: RatingContextKey;
  title: string;
  description: string;
  raterRole: RaterRole;
  targets: RatingTargetSpec[];
  requiresAgent: boolean;
  allowComment: boolean;
  allowFiles: boolean;
  effort: RatingEffort;
  weight: number;
  windowDays: number;
}
