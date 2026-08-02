import { z } from "zod";

/*
 * address, state, and lga are no longer collected at signup - the register
 * endpoint is one shape for every role - so this is where an agent supplies them.
 * Setting `lga` also re-resolves the agent's zone; see AgentService.updateProfile.
 */
export const updateAgentProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  state: z.string().max(100).optional(),
  lga: z.string().max(100).optional(),
});

export type UpdateAgentProfileDto = z.infer<typeof updateAgentProfileSchema>;
