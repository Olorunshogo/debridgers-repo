import { z } from "zod";

export const disputeRatingSchema = z.object({
  reason: z.string().min(10).max(1000),
});

export type DisputeRatingDto = z.infer<typeof disputeRatingSchema>;
