import type { RatingContextConfig, RatingContextKey } from "./types";

/*
 * Every rating flow the platform supports, as data.
 * Adding a new trigger later (a rider, a repeat-order context, the `company` role) is a new entry here, never a new component - the driver component reads whichever config it is given.
 *
 * `requiresAgent` is how "what if the buyer did not buy through an agent" gets answered: the order already snapshots `order_source`/`agent_id` at write time (`orders.schema.ts`).
 * The trigger checks that snapshot once and skips a context outright rather than the UI branching on it.
 */
export const RATING_CONTEXTS: Record<RatingContextKey, RatingContextConfig> = {
  ORDER_COMPLETED_BUYER_RATES_AGENT: {
    key: "ORDER_COMPLETED_BUYER_RATES_AGENT",
    title: "Rate your agent",
    description: "How did they handle your order?",
    raterRole: "buyer",
    targets: [
      { type: "agent", facetGroup: "agentService", label: "Your agent" },
    ],
    requiresAgent: true,
    allowComment: true,
    allowFiles: false,
    effort: "major",
    weight: 1.0,
    windowDays: 14,
  },

  ORDER_COMPLETED_BUYER_RATES_DELIVERY: {
    key: "ORDER_COMPLETED_BUYER_RATES_DELIVERY",
    title: "Rate this order",
    description: "Help us keep fulfilment sharp.",
    raterRole: "buyer",
    targets: [
      { type: "delivery", facetGroup: "delivery", label: "This delivery" },
    ],
    requiresAgent: false,
    allowComment: true,
    allowFiles: true,
    effort: "major",
    weight: 1.0,
    windowDays: 14,
  },

  /* Micro effort: one tap, submitted straight after a field delivery, so its weight counts for less than a considered rating. */
  ORDER_COMPLETED_AGENT_RATES_BUYER: {
    key: "ORDER_COMPLETED_AGENT_RATES_BUYER",
    title: "Rate this buyer",
    description: "This stays internal.",
    raterRole: "agent",
    targets: [
      { type: "buyer", facetGroup: "buyerConduct", label: "The buyer" },
    ],
    requiresAgent: true,
    allowComment: true,
    allowFiles: false,
    effort: "micro",
    weight: 0.4,
    windowDays: 7,
  },
};

/** Every context a given role can raise a rating from, for a trigger to filter on. */
export function contextsForRater(
  raterRole: RatingContextConfig["raterRole"],
): RatingContextConfig[] {
  return Object.values(RATING_CONTEXTS).filter(
    (context) => context.raterRole === raterRole,
  );
}
