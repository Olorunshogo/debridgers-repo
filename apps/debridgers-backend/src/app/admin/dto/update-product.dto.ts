import { z } from "zod";

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(50).optional(),
  price_kobo: z.number().int().positive().optional(),
  /* One of productCategories in @debridgers/ui-web. Plain text, so adding a
     category needs no migration. */
  category: z.string().max(50).optional(),
  measure_value: z.number().int().min(0).optional(),
  measure_unit: z.enum(["kg", "litre", "piece"]).optional(),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
