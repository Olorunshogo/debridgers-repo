import { z } from "zod";
import { createEmailSchema, createRequiredString } from "../generics";

/* Mirrors admin-register.service.ts, which only enforces a min(8) password - not the full complexity rule apps/debridgers-backend/src/app/auth register.dto.ts applies to buyer/agent signup. */
export const adminRegisterSchema = z.object({
  email: createEmailSchema(),
  firstName: createRequiredString("First name"),
  lastName: createRequiredString("Last name"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  inviteCode: createRequiredString("Invitation code"),
});

export type AdminRegisterValues = z.infer<typeof adminRegisterSchema>;
