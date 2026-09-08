import { z } from "zod";

/*
 * starts_at/ends_at are ISO strings kept as strings through the pipe and parsed in the service.
 * An unparseable date then reports as a message rather than an Invalid Date that silently never matches a window.
 */
export const createPromotionSchema = z
  .object({
    name: z.string().min(2, "Give the campaign a name"),
    scope: z.enum(["global", "zone", "first_order"]),
    zone_id: z.number().int().positive().nullish(),
    starts_at: z.string().min(1, "Start required"),
    ends_at: z.string().min(1, "End required"),
  })
  .refine((value) => value.scope !== "zone" || Boolean(value.zone_id), {
    message: "A zone-scoped campaign needs a zone.",
    path: ["zone_id"],
  });

export type CreatePromotionDto = z.infer<typeof createPromotionSchema>;
