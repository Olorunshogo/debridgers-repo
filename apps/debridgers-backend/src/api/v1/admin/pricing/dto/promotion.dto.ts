import { z } from "zod";

export const createPromotionSchema = z
  .object({
    name: z.string().min(2, "Give the campaign a name"),
    scope: z.enum(["global", "zone", "first_order"]),
    zone_id: z.number().int().positive().nullish(),
    /* ISO strings. Kept as strings through the pipe and parsed in the service,
       so an unparseable date reports as a message rather than as an Invalid
       Date that silently never matches a window. */
    starts_at: z.string().min(1, "Start required"),
    ends_at: z.string().min(1, "End required"),
  })
  .refine((value) => value.scope !== "zone" || Boolean(value.zone_id), {
    message: "A zone-scoped campaign needs a zone.",
    path: ["zone_id"],
  });

export type CreatePromotionDto = z.infer<typeof createPromotionSchema>;
