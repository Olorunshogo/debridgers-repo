import { useState } from "react";
import { buildPageMeta } from "../../lib/seo";
import { Link } from "react-router";
import { AnimatePresence } from "framer-motion";
import { AuthFormShell, AuthSignupForm } from "@debridgers/ui-web";
import AuthSuccessModal from "../../components/auth/AuthSuccessModal";
import { useSignup, ROLE_SIGNUP_CONFIG } from "../../features/auth";

export function meta() {
  return buildPageMeta({
    title: "Create Account | Debridgers",
    description:
      "Create your Debridgers account to order fresh foodstuff at market prices.",
    path: "/signup",
    noIndex: true,
  });
}

/*
 * This app only ever serves buyers, so there is no role tab to choose - the
 * form is buyer's config, fixed. AuthSignupForm hides its tab row when given
 * a single role, so this composes the same way the multi-role picker used to.
 */
export default function SignupPage() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const { form, config, submit, apiError, isSubmitting } = useSignup({
    config: ROLE_SIGNUP_CONFIG.buyer,
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
            navigateState={{ email: registeredEmail, role: "buyer" }}
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
          roles={[
            {
              value: "buyer",
              label: ROLE_SIGNUP_CONFIG.buyer.label,
              fields: ROLE_SIGNUP_CONFIG.buyer.fields,
            },
          ]}
          activeRole="buyer"
          onRoleChange={() => undefined}
          form={form}
          onSubmit={submit}
          isSubmitting={isSubmitting}
        />
      </AuthFormShell>
    </>
  );
}
