import { z } from "zod";

/*
 * accepted_terms/terms_document/terms_version: consent to the agent agreement, required exactly as on the buyer register endpoint.
 * The application creates a pending account rather than an active one, but it is still the moment the terms were shown, so it is the moment worth recording.
 * Multipart, so the checkbox is coerced from the "true" a FormData body appends rather than compared to a boolean.
 * referred_by_agent_code and below are optional fields that can be collected later by admin or in a second step.
 */
export const applyAgentSchema = z
  .object({
    first_name: z.string().min(2, "First name is required"),
    last_name: z.string().min(1).optional(),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Invalid phone number"),
    lga: z.string().min(1, "LGA is required"),
    address: z.string().min(5, "Home address is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
    referred_by_agent_code: z.string().optional(),
    accepted_terms: z
      .union([z.literal("true"), z.literal(true)])
      .transform(() => true as const),
    terms_document: z.string().min(1).max(64),
    terms_version: z.string().min(1).max(32),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ApplyAgentDto = z.infer<typeof applyAgentSchema>;
