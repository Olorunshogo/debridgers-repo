import { z } from "zod";

export const createContactSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(5, "Message must be at least 5 words").max(1000),
});

export type CreateContactDto = z.infer<typeof createContactSchema>;
