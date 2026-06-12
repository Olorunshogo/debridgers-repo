import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  delivery_address: z.string().max(500).optional(),
  email_notifications: z.boolean().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
