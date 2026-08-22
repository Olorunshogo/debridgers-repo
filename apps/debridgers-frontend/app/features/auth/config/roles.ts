import {
  createRoleSignupSchema,
  createRequiredString,
  referralCodeField,
  type AuthFieldDescriptor,
  type RoleSignupConfig,
  type SignupFormValues,
} from "@debridgers/ui-web";
import type { SelfRegisterableRole } from "@debridgers/api-client";

/*
 * The single place a self-registerable role is described.
 *
 * Adding a role (farmer) means adding one entry here plus the backend enum and
 * allow-list. No page, hook, or schema changes. There must never be an
 * `if (role === "agent")` branch in a page or hook - if a role needs different
 * behaviour, it belongs in this table.
 */

/*
 * Field descriptors come from @debridgers/ui-web. The shared form renders
 * whatever descriptors it is given, so this table is the only place that knows
 * which fields belong to which role.
 */
export type SignupFieldDescriptor = AuthFieldDescriptor;
export type { RoleSignupConfig, SignupFormValues };

// === Shared base fields, in render order

const BASE_FIELDS: readonly SignupFieldDescriptor[] = [
  {
    name: "fullName",
    label: "Full name",
    type: "text",
    placeholder: "Your full name",
    autoComplete: "name",
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "phone",
    label: "Phone number",
    type: "tel",
    placeholder: "08012345678",
    autoComplete: "tel",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Create a password",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm password",
    type: "password",
    placeholder: "Re-enter your password",
    autoComplete: "new-password",
  },
];

// === Role table

export const ROLE_SIGNUP_CONFIG: Record<
  SelfRegisterableRole,
  RoleSignupConfig
> = {
  buyer: {
    role: "buyer",
    label: "Buyer",
    schema: createRoleSignupSchema({
      referredByAgentCode: referralCodeField,
    }),
    fields: [
      ...BASE_FIELDS,
      /*
       * Referral code hidden for now, not removed. The schema field above stays
       * optional so the form still validates and the register payload still
       * carries referred_by_agent_code when something else supplies it - a
       * referral link, for instance. Uncomment to put the input back.
       */
      // {
      //   name: "referredByAgentCode",
      //   label: "Agent referral code",
      //   type: "text",
      //   optional: true,
      // },
    ],
    redirectTo: "/buyer-dashboard",
    successTitle: "Account Created",
    successDescription: "Check your email for the verification code.",
  },

  /*
   * Agent no longer collects area/address at signup. Those live on
   * agent_profiles and are collected in agent settings, so one register
   * endpoint serves every role. See docs/frontend/AuthPLAN.md phases 3 and 6.
   */
  agent: {
    role: "agent",
    label: "Agent",
    schema: createRoleSignupSchema({}),
    fields: BASE_FIELDS,
    redirectTo: "/agent-dashboard",
    successTitle: "Application Submitted",
    successDescription:
      "Check your email for a verification code. We'll review your application within 48 hours.",
  },
};

export const SIGNUP_ROLES: readonly SelfRegisterableRole[] = Object.keys(
  ROLE_SIGNUP_CONFIG,
) as SelfRegisterableRole[];

export function getRoleSignupConfig(
  role: SelfRegisterableRole,
): RoleSignupConfig {
  return ROLE_SIGNUP_CONFIG[role];
}

/*
 * Retained for the agent profile form that now owns these fields, so the
 * validation rule lives with the role rather than being retyped in settings.
 */
export const agentProfileFields = {
  area: createRequiredString("Area", { min: 1 }),
  address: createRequiredString("Home address", { min: 5 }),
};
