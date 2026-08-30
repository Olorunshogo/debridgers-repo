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
  /* Fields only some roles collect. Optional here because this type is the
     union across every role, not the shape of any one form. */
  lga?: string;
  address?: string;
  cv?: File;
}

/** Name split off the single full-name input, plus the role being created. */
export interface SignupIdentity {
  first_name: string;
  last_name: string;
  role: string;
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
  /*
   * How this role's account is created. Omitted means the shared register
   * endpoint, which is right for any role the plain form can express.
   *
   * A role needing its own endpoint - an agent application carries an LGA, a
   * home address and a CV file, so it is multipart against /agent/apply -
   * supplies it here rather than the hook learning role names.
   */
  register?: (
    values: SignupFormValues,
    identity: SignupIdentity,
  ) => Promise<void>;
}
