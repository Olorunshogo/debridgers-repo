import { Link } from "react-router";
import {
  agentTerms,
  createRoleSignupSchema,
  createRequiredString,
  acceptedTermsField,
  lgaField,
  addressField,
  cvField,
  normalizeNigerianPhone,
  lgaSelectOptions,
  type AuthFieldDescriptor,
  type RoleSignupConfig,
  type SignupFormValues,
} from "@debridgers/ui-web";
import type { SelfRegisterableRole } from "@debridgers/api-client";
import { applyAgent } from "@debridgers/api-client";

/*
 * The single place this app's self-registerable role is described.
 * This app only ever serves agents - each role now lives on its own subdomain app, so there is no cross-role table to keep in sync here.
 * Debridgers-buyer carries the same shape for its own role.
 */

/*
 * Field descriptors come from @debridgers/ui-web.
 * The shared form renders whatever descriptors it is given, so this table is the only place that knows which fields belong to this role.
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
 * Labels, not slugs: the API stores the LGA as free text and admin screens display it, so "Kaduna North" is the value worth persisting.
 * Agents are Kaduna-only for now, so this is the one state's LGA list, not the full country the shared dataset also carries.
 */
const AGENT_LGA_OPTIONS: readonly string[] = lgaSelectOptions("Kaduna").map(
  (lga) => lga.label,
);

/*
 * The consent tick for a role, linking to that role's own document.
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
  Extract<SelfRegisterableRole, "agent">,
  RoleSignupConfig
> = {
  /* An agent collects an LGA, a home address and optionally a CV at signup, and posts to /agent/apply rather than /auth/register: the account is created `pending` for admin approval, not active. */
  agent: {
    role: "agent",
    label: "Agent",
    schema: createRoleSignupSchema({
      lga: lgaField,
      address: addressField,
      cv: cvField,
      acceptedTerms: acceptedTermsField,
    }),
    /* termsField is last in this array, so consent is the final thing read before the button. */
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
      termsField(agentTerms.slug, agentTerms.title),
    ],
    terms: { slug: agentTerms.slug, version: agentTerms.version },
    register: async (values, identity) => {
      const form = new FormData();
      form.append("first_name", identity.first_name);
      form.append("last_name", identity.last_name);
      form.append("email", values.email);
      form.append(
        "phone",
        values.phone ? normalizeNigerianPhone(values.phone) : "",
      );
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
       * Consent, appended as strings because this endpoint is multipart.
       * The agreement is still a draft, so what is recorded is consent to version 0.1: the version is exactly what makes that identifiable later, once the reviewed agreement replaces it.
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

export function getRoleSignupConfig(): RoleSignupConfig {
  return ROLE_SIGNUP_CONFIG.agent;
}

/* Retained for the agent profile form that owns these fields, so the validation rule lives with the role rather than being retyped in settings. */
export const agentProfileFields = {
  area: createRequiredString("Area", { min: 1 }),
  address: createRequiredString("Home address", { min: 5 }),
};
