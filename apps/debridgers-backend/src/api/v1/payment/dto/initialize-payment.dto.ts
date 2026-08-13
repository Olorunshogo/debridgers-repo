import { z } from "zod";

export const initializePaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  email: z.string().email("Invalid email"),
  agent_id: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type InitializePaymentDto = z.infer<typeof initializePaymentSchema>;
