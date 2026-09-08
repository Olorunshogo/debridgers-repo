import { z } from "zod";
import { RATING_CONTEXTS } from "@debridgers/ratings";

/*
 * Context keys are drawn from the registry rather than restated, so a context added to @debridgers/ratings is immediately acceptable here with no second edit.
 */
const CONTEXT_KEYS = Object.keys(RATING_CONTEXTS) as [string, ...string[]];

export const submitRatingSchema = z.object({
  contextKey: z.enum(CONTEXT_KEYS),
  orderId: z.number().int().positive(),
  score: z.number().int().min(1).max(5),
  facets: z.array(z.string()).default([]),
  comment: z.string().max(2000).optional(),
});

export type SubmitRatingDto = z.infer<typeof submitRatingSchema>;
