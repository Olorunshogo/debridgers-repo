import { z } from "zod";
import { USER_ROLES } from "../../../interfaces/users/roles.type";

export const registerSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z
    .enum([
      USER_ROLES.ADMIN,
      USER_ROLES.AGENT,
      USER_ROLES.BUYER,
      USER_ROLES.COMPANY,
    ])
    .default(USER_ROLES.AGENT),
});

export type RegisterDto = z.infer<typeof registerSchema>;
