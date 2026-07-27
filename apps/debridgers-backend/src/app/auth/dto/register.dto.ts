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

/*
 * Roles a user may create for themselves through the public register endpoint.
 *
 * This is a security boundary, not a convenience list. It is deliberately an
 * explicit allow-list rather than the full user_role enum, so adding a role to
 * the database never silently makes it self-registerable. Admin and company must
 * never appear here.
 */
export const SELF_REGISTERABLE_ROLES = [
  USER_ROLES.BUYER,
  USER_ROLES.AGENT,
] as const;

export type SelfRegisterableRole = (typeof SELF_REGISTERABLE_ROLES)[number];

export const registerSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number").optional(),
  password: passwordRule,
  /*
   * Defaults to buyer, the least-privileged self-registerable role, so a request
   * that omits the field can only ever create a harmless account.
   */
  role: z
    .enum(SELF_REGISTERABLE_ROLES as unknown as [string, ...string[]])
    .default(USER_ROLES.BUYER),
  referred_by_agent_code: z.string().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
