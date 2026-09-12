import { z } from "zod";

/* Mirrors updateAgentProfileSchema on the backend (apps/debridgers-backend/src/api/v1/agent/dto/update-agent-profile.dto.ts). */
export const agentProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(20),
  address: z.string().max(500),
  state: z.string().max(100),
  lga: z.string().max(100),
});

export type AgentProfileValues = z.infer<typeof agentProfileSchema>;
