import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  delivery_address: z.string().max(500).optional(),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
  currency: z.string().min(1).max(8).optional(),
  country: z.string().length(2).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
