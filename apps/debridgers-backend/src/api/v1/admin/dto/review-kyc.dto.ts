import { z } from "zod";

export const reviewKycSchema = z.object({
  action: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional(),
});

export type ReviewKycDto = z.infer<typeof reviewKycSchema>;
