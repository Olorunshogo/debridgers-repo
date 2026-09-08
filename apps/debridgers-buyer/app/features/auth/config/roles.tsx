import { Link } from "react-router";
import {
  buyerTerms,
  createRoleSignupSchema,
  referralCodeField,
  acceptedTermsField,
  type AuthFieldDescriptor,
  type RoleSignupConfig,
  type SignupFormValues,
} from "@debridgers/ui-web";
import type { SelfRegisterableRole } from "@debridgers/api-client";

/*
 * The single place this app's self-registerable role is described.
 *
 * This app only ever serves buyers - each role now lives on its own subdomain app, so there is no cross-role table to keep in sync here.
 * Debridgers-agent carries the same shape for its own role.
 */

/*
 * Field descriptors come from @debridgers/ui-web.
 * The shared form renders whatever descriptors it is given, so this table is the only place that knows which fields belong to this role.
 */
export type SignupFieldDescriptor = AuthFieldDescriptor;
export type { RoleSignupConfig, SignupFormValues };

// === Shared base fields
// In render order.

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

/*
 * The consent tick for a role, linking to that role's own document.
 *
 * Built from the document rather than written out, so the slug in the link and the version in the consent record cannot drift from the text on the page.
 */
function termsField(slug: string, label: string): SignupFieldDescriptor {
  return {
    name: "acceptedTerms",
    label: `I accept the ${label}`,
    type: "checkbox",
    labelContent: (
      <>
        I accept the{" "}
        <Link
          to={`/legal/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary font-semibold underline underline-offset-2"
        >
          {label}
        </Link>
      </>
    ),
  };
}

// === Role table

export const ROLE_SIGNUP_CONFIG: Record<
  Extract<SelfRegisterableRole, "buyer">,
  RoleSignupConfig
> = {
  buyer: {
    role: "buyer",
    label: "Buyer",
    schema: createRoleSignupSchema({
      referredByAgentCode: referralCodeField,
      acceptedTerms: acceptedTermsField,
    }),
    fields: [
      ...BASE_FIELDS,
      /*
       * Referral code hidden for now, not removed.
       * The schema field above stays optional so the form still validates and the register payload still carries referred_by_agent_code when something else supplies it - a referral link, for instance.
       * Uncomment to put the input back.
       */
      // {
      //   name: "referredByAgentCode",
      //   label: "Agent referral code",
      //   type: "text",
      //   optional: true,
      // },
      // Last, so consent is the final thing read before the button.
      termsField(buyerTerms.slug, buyerTerms.title),
    ],
    terms: { slug: buyerTerms.slug, version: buyerTerms.version },
    redirectTo: "/buyer-dashboard",
    successTitle: "Account Created",
    successDescription: "Check your email for the verification code.",
  },
};

export function getRoleSignupConfig(): RoleSignupConfig {
  return ROLE_SIGNUP_CONFIG.buyer;
}
