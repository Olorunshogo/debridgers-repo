import { z } from "zod";
import { USER_ROLES } from "../../../interfaces/users/roles.type";

export const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

export const registerSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number").optional(),
  password: passwordRule,
  role: z.literal(USER_ROLES.BUYER).default(USER_ROLES.BUYER),
  referred_by_agent_code: z.string().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
