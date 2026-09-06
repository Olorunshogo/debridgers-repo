import { Link } from "react-router";
import {
  agentTerms,
  buyerTerms,
  createRoleSignupSchema,
  createRequiredString,
  referralCodeField,
  acceptedTermsField,
  lgaField,
  addressField,
  cvField,
  type AuthFieldDescriptor,
  type RoleSignupConfig,
  type SignupFormValues,
} from "@debridgers/ui-web";
import type { SelfRegisterableRole } from "@debridgers/api-client";
import { applyAgent } from "@debridgers/api-client";
import { kadunaLgas } from "@/models/models";

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

/*
 * Labels, not slugs: the API stores the LGA as free text and admin screens
 * display it, so "Kaduna North" is the value worth persisting.
 */
const AGENT_LGA_OPTIONS: readonly string[] = (
  kadunaLgas as { value: string; label: string }[]
).map((lga) => lga.label);

/*
 * The consent tick for a role, linking to that role's own document.
 *
 * Built from the document rather than written out, so the slug in the link and
 * the version in the consent record cannot drift from the text on the page.
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
  SelfRegisterableRole,
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
      /* Last, so consent is the final thing read before the button. */
      termsField(buyerTerms.slug, buyerTerms.title),
    ],
    terms: { slug: buyerTerms.slug, version: buyerTerms.version },
    redirectTo: "/buyer-dashboard",
    successTitle: "Account Created",
    successDescription: "Check your email for the verification code.",
  },

  /*
   * An agent collects an LGA, a home address and optionally a CV at signup, and
   * posts to /agent/apply rather than /auth/register: the account is created
   * `pending` for admin approval, not active. That difference lives here, in
   * the role table, so no page or hook ever branches on the role name.
   */
  agent: {
    role: "agent",
    label: "Agent",
    schema: createRoleSignupSchema({
      lga: lgaField,
      address: addressField,
      cv: cvField,
      acceptedTerms: acceptedTermsField,
    }),
    fields: [
      ...BASE_FIELDS,
      {
        name: "lga",
        label: "Local government area",
        type: "select",
        placeholder: "Select your LGA",
        options: AGENT_LGA_OPTIONS,
      },
      {
        name: "address",
        label: "Home address",
        type: "text",
        placeholder: "12 Barnawa Market Road, Kaduna",
        autoComplete: "street-address",
      },
      {
        name: "cv",
        label: "CV",
        type: "file",
        optional: true,
        accept: ".pdf,.doc,.docx",
        hint: "PDF or Word, up to 5MB. You can add this later if you do not have it to hand.",
      },
      /* Last, so consent is the final thing read before the button. */
      termsField(agentTerms.slug, agentTerms.title),
    ],
    terms: { slug: agentTerms.slug, version: agentTerms.version },
    register: async (values, identity) => {
      const form = new FormData();
      form.append("first_name", identity.first_name);
      form.append("last_name", identity.last_name);
      form.append("email", values.email);
      form.append("phone", values.phone ?? "");
      form.append("lga", values.lga ?? "");
      form.append("address", values.address ?? "");
      form.append("password", values.password);
      form.append("confirm_password", values.password);

      if (values.referredByAgentCode) {
        form.append("referred_by_agent_code", values.referredByAgentCode);
      }

      if (values.cv) {
        form.append("cv", values.cv);
      }

      /*
       * Consent, appended as strings because this endpoint is multipart. The
       * agreement is still a draft, so what is recorded is consent to version
       * 0.1: the version is exactly what makes that identifiable later, once
       * the reviewed agreement replaces it.
       */
      form.append("accepted_terms", "true");
      form.append("terms_document", agentTerms.slug);
      form.append("terms_version", agentTerms.version);

      await applyAgent(form);
    },
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
