import { z } from "zod";
import { createEmailSchema, createRequiredString } from "../generics";

/* Mirrors createContactSchema on the backend (apps/debridgers-backend/src/api/v1/contact/dto/create-contact.dto.ts), so a valid form is never rejected server-side. */
export const supportTicketSchema = z.object({
  fullName: createRequiredString("Full name", { min: 2 }),
  email: createEmailSchema(),
  message: createRequiredString("Message", { min: 15, max: 1000 }),
});

export type SupportTicketValues = z.infer<typeof supportTicketSchema>;
