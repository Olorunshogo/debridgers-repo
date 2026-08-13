import { z } from "zod";

export const updateAgentStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  admin_notes: z.string().max(500).optional(),
});

export type UpdateAgentStatusDto = z.infer<typeof updateAgentStatusSchema>;
