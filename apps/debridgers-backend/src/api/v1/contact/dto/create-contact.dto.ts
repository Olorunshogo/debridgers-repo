import { z } from "zod";

export const createContactSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().max(100).optional(),
  message: z
    .string()
    .min(15, "Message must be at least 15 characters")
    .max(1000),
});

export type CreateContactDto = z.infer<typeof createContactSchema>;
