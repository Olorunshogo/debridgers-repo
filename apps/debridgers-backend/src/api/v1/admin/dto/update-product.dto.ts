import { z } from "zod";

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(50).optional(),
  price_kobo: z.number().int().positive().optional(),
  /* One of productCategories in @debridgers/ui-web. Plain text, so adding a
     category needs no migration. */
  category: z.string().max(50).optional(),
  /* Leaf id from the product_categories tree. See create-product.dto. */
  category_id: z.number().int().positive().nullable().optional(),
  measure_value: z.number().int().min(0).optional(),
  measure_unit: z.enum(["kg", "litre", "piece"]).optional(),
  weight_grams: z.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
  /*
   * Same relative-path allowance as the create DTO. This was `.url()`, which
   * rejected bundled images like /images/products/rice.jpg, so any product using
   * one could be created but never edited.
   */
  image_url: z
    .string()
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//.test(value),
      "Must be a URL or a path starting with /",
    )
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
