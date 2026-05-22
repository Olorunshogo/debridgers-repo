import { z } from "zod";

export const updateAgentProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
});

export type UpdateAgentProfileDto = z.infer<typeof updateAgentProfileSchema>;
