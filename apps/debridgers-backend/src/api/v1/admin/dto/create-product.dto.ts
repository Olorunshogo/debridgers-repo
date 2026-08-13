import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  price_kobo: z.number().int().positive(),
  /* One of productCategories in @debridgers/ui-web. Plain text, so adding a
     category needs no migration. */
  category: z.string().max(50).optional(),
  /*
   * Leaf id from the product_categories tree. Supersedes `category` above, which
   * cannot express "Grains > Rice > Ofada". Both are accepted while the flat
   * column is still read.
   */
  category_id: z.number().int().positive().nullable().optional(),
  measure_value: z.number().int().min(0).optional(),
  measure_unit: z.enum(["kg", "litre", "piece"]).optional(),
  weight_grams: z.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
  /*
   * Accepts an absolute URL (Cloudinary) or an app-relative path
   * (/images/products/...). z.string().url() rejected the latter, so any
   * product using a bundled image could not be saved at all.
   */
  image_url: z
    .string()
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//.test(value),
      "Must be a URL or a path starting with /",
    )
    .optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
