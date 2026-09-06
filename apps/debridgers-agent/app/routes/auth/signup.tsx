import { useState } from "react";
import { buildPageMeta } from "../../lib/seo";
import { Link } from "react-router";
import { AnimatePresence } from "framer-motion";
import { AuthFormShell, AuthSignupForm } from "@debridgers/ui-web";
import AuthSuccessModal from "../../components/auth/AuthSuccessModal";
import { useSignup, ROLE_SIGNUP_CONFIG } from "../../features/auth";

export function meta() {
  return buildPageMeta({
    title: "Agent Application | Debridgers",
    description:
      "Apply to become a Debridgers field agent and earn commission selling fresh foodstuff.",
    path: "/signup",
    noIndex: true,
  });
}

/*
 * This app only ever serves agents, so there is no role tab to choose - the
 * form is agent's config, fixed. AuthSignupForm hides its tab row when given
 * a single role, so this composes the same way the multi-role picker used to.
 */
export default function SignupPage() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const { form, config, submit, apiError, isSubmitting } = useSignup({
    config: ROLE_SIGNUP_CONFIG.agent,
    onRequiresVerification: (email: string) => setRegisteredEmail(email),
  });

  return (
    <>
      <AnimatePresence>
        {registeredEmail && (
          <AuthSuccessModal
            title={config.successTitle}
            description={config.successDescription}
            submitButtonText="Verify Email"
            redirectUrl="/verify-email"
            navigateState={{ email: registeredEmail, role: "agent" }}
          />
        )}
      </AnimatePresence>

      <AuthFormShell
        heading="Apply to become an agent"
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
          roles={[
            {
              value: "agent",
              label: ROLE_SIGNUP_CONFIG.agent.label,
              fields: ROLE_SIGNUP_CONFIG.agent.fields,
            },
          ]}
          activeRole="agent"
          onRoleChange={() => undefined}
          form={form}
          onSubmit={submit}
          isSubmitting={isSubmitting}
        />
      </AuthFormShell>
    </>
  );
}
