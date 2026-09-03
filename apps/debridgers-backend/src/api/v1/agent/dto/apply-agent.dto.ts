import { z } from "zod";

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
    // optional fields - can be collected later by admin or in a second step
    referred_by_agent_code: z.string().optional(),
    /*
     * Consent to the agent agreement, required exactly as it is on the buyer
     * register endpoint. The application creates a pending account rather than
     * an active one, but it is still the moment the terms were shown, so it is
     * the moment worth recording.
     *
     * Multipart, so the values arrive as strings: the checkbox is coerced from
     * the "true" the form appends rather than compared to a boolean that a
     * FormData body can never carry.
     */
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
