import { z } from "zod";

export const editRatingSchema = z.object({
  score: z.number().int().min(1).max(5).optional(),
  facets: z.array(z.string()).optional(),
  comment: z.string().max(2000).optional(),
});

export type EditRatingDto = z.infer<typeof editRatingSchema>;
