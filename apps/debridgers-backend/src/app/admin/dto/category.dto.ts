import { z } from "zod";

/*
 * The slug is derived server-side from the name, so it is deliberately not
 * accepted here: a client-supplied slug could disagree with the displayed name.
 */
export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  parent_id: z.number().int().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
