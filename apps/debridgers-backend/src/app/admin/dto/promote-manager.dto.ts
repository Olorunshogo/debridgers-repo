import { z } from "zod";

export const promoteManagerSchema = z.object({
  managed_state: z.string().min(2, "State is required"),
});

export type PromoteManagerDto = z.infer<typeof promoteManagerSchema>;
