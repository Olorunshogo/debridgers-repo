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
    // optional fields — can be collected later by admin or in a second step
    referred_by_agent_code: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ApplyAgentDto = z.infer<typeof applyAgentSchema>;
