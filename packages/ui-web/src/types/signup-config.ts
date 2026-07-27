import type { ZodType } from "zod";
import type { AuthFieldDescriptor } from "../components/auth/auth-field";
import type { SignupValues } from "../schemas/auth/signup";

/*
 * Shape of a role's signup configuration.
 *
 * The TYPE lives here because the shared hook and form both consume it. The
 * TABLE of actual roles stays in the consuming app - which roles exist and what
 * each collects is app policy, not shared UI.
 */

/** Union of every field any role's signup form can carry. */
export interface SignupFormValues extends SignupValues {
  referredByAgentCode?: string;
}

export interface RoleSignupConfig {
  role: string;
  /** Tab label on the signup page. */
  label: string;
  schema: ZodType<SignupFormValues, SignupFormValues>;
  fields: readonly AuthFieldDescriptor[];
  /** Where to send the user once registration and verification succeed. */
  redirectTo: string;
  /* Post-signup confirmation copy. Lives with the role so a new role brings its
     own wording with it. */
  successTitle: string;
  successDescription: string;
}
