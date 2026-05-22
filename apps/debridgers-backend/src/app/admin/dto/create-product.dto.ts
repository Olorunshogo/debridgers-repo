import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  price_kobo: z.number().int().positive(),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
