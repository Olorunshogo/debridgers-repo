import { z } from "zod";

export const applyAgentSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10, "Invalid phone number"),
  address: z.string().min(5, "Address is required"),
  nin: z.string().min(11, "NIN must be 11 digits").max(11).optional(),
});

export type ApplyAgentDto = z.infer<typeof applyAgentSchema>;
