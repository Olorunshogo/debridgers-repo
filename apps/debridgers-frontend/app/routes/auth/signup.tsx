import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence } from "framer-motion";
import { AuthFormShell, AuthSignupForm } from "@debridgers/ui-web";
import type { SelfRegisterableRole } from "@debridgers/api-client";
import AuthSuccessModal from "../../components/auth/AuthSuccessModal";
import {
  useSignup,
  ROLE_SIGNUP_CONFIG,
  SIGNUP_ROLES,
} from "../../features/auth";

export function meta() {
  return [
    { title: "Create Account | Debridgers" },
    {
      name: "description",
      content:
        "Create your Debridgers account. Sign up as a buyer to order fresh foodstuff at market prices, or as an agent to earn commission.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/*
 * Composition only. Every role-specific decision - which fields, which schema,
 * which success copy, where to redirect - comes from ROLE_SIGNUP_CONFIG, so
 * adding a role does not touch this file.
 */
export default function SignupPage() {
  const [activeRole, setActiveRole] = useState<SelfRegisterableRole>("buyer");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const { form, config, submit, apiError, isSubmitting } = useSignup({
    config: ROLE_SIGNUP_CONFIG[activeRole],
    onRequiresVerification: (email: string) => setRegisteredEmail(email),
  });

  /*
   * Agent applications are closed until the field programme launches, so the
   * role is shown and refused rather than removed. Reopening it is deleting the
   * two lines below, and nothing else: the role's fields, schema and endpoint
   * are all still in ROLE_SIGNUP_CONFIG and untouched.
   */
  const CLOSED_ROLES: Partial<Record<SelfRegisterableRole, string>> = {
    agent: "Agent applications open soon. You can create a buyer account now.",
  };

  const roleTabs = SIGNUP_ROLES.map((role) => ({
    value: role,
    label: ROLE_SIGNUP_CONFIG[role].label,
    fields: ROLE_SIGNUP_CONFIG[role].fields,
    disabled: Boolean(CLOSED_ROLES[role]),
    disabledNote: CLOSED_ROLES[role],
  }));

  return (
    <>
      <AnimatePresence>
        {registeredEmail && (
          <AuthSuccessModal
            title={config.successTitle}
            description={config.successDescription}
            submitButtonText="Verify Email"
            redirectUrl="/verify-email"
            navigateState={{ email: registeredEmail, role: activeRole }}
          />
        )}
      </AnimatePresence>

      <AuthFormShell
        heading="Create your account"
        apiError={apiError}
        subheading={
          <>
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-semibold underline underline-offset-2"
            >
              Log in
            </Link>
          </>
        }
      >
        <AuthSignupForm
          roles={roleTabs}
          activeRole={activeRole}
          onRoleChange={(role: string) =>
            setActiveRole(role as SelfRegisterableRole)
          }
          form={form}
          onSubmit={submit}
          isSubmitting={isSubmitting}
        />
      </AuthFormShell>
    </>
  );
}
