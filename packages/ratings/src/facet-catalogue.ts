import type { FacetDefinition, FacetGroupKey } from "./types";

/*
 * Facets are versioned data, never hardcoded inline into a form.
 * Editing this list bumps `FACET_CATALOGUE_VERSION`, and a submission stores the version it was captured under, so a later edit here does not retroactively change what a past rater was asked to score.
 */

export const FACET_CATALOGUE_VERSION = 1;

/*
 * `agentService` facets come from buyers and target whichever agent handled the order.
 * `buyerConduct` facets come from agents and target the buyer on a field-mode order.
 * `delivery` facets come from buyers and target the order's fulfilment rather than a person.
 */
export const FACET_CATALOGUE: Record<FacetGroupKey, FacetDefinition[]> = {
  agentService: [
    {
      key: "responsiveness",
      label: "Responsiveness",
      group: "agentService",
      version: 1,
    },
    {
      key: "communication",
      label: "Communication",
      group: "agentService",
      version: 1,
    },
    {
      key: "order_accuracy",
      label: "Got the order right",
      group: "agentService",
      version: 1,
    },
    {
      key: "professionalism",
      label: "Professionalism",
      group: "agentService",
      version: 1,
    },
  ],

  buyerConduct: [
    {
      key: "available_at_delivery",
      label: "Available at delivery",
      group: "buyerConduct",
      version: 1,
    },
    {
      key: "order_accuracy",
      label: "Order details were accurate",
      group: "buyerConduct",
      version: 1,
    },
    {
      key: "cooperative",
      label: "Easy to work with",
      group: "buyerConduct",
      version: 1,
    },
  ],

  delivery: [
    {
      key: "product_quality",
      label: "Product quality",
      group: "delivery",
      version: 1,
    },
    {
      key: "timeliness",
      label: "Delivered on time",
      group: "delivery",
      version: 1,
    },
    {
      key: "rider_conduct",
      label: "Rider conduct",
      group: "delivery",
      version: 1,
    },
    {
      key: "packaging",
      label: "Packaging condition",
      group: "delivery",
      version: 1,
    },
  ],
};

/** A facet group's definitions, for a form that renders one group of chips. */
export function facetsForGroup(group: FacetGroupKey): FacetDefinition[] {
  return FACET_CATALOGUE[group];
}
