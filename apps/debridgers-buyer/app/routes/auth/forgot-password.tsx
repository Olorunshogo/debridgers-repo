import { buildPageMeta } from "../../lib/seo";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AuthFormShell,
  AuthCredentialsForm,
  DialogSuccessPanel,
  swappedContentVariants,
  swappedContentTransition,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { useForgotPassword } from "../../features/auth";

export function meta() {
  return buildPageMeta({
    title: "Forgot Password | Debridgers",
    description:
      "Reset your Debridgers account password. We'll email you a link to set a new one.",
    path: "/forgot-password",
    noIndex: true,
  });
}

const REQUEST_FIELDS: readonly AuthFieldDescriptor[] = [
  {
    name: "email",
    label: "Email address",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
];

/*
 * One step only: request the reset link. The link itself carries the actual
 * reset token to /reset-password - there is no code to type here, so this
 * page never collects a password. Previously had a fake step 2 that relabeled
 * the emailed link's 64-char token as a short "code," duplicating
 * reset-password.tsx with misleading copy - removed rather than kept in sync.
 */
export default function ForgotPasswordPage() {
  const request = useForgotPassword();

  return (
    <AuthFormShell
      heading="Forgot your password?"
      apiError={request.apiError}
      subheading={
        request.sent ? undefined : (
          <>
            Remembered it?{" "}
            <Link
              to="/login"
              className="text-primary font-semibold underline underline-offset-2"
            >
              Log in
            </Link>
          </>
        )
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={request.sent ? "sent" : "form"}
          variants={swappedContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={swappedContentTransition}
        >
          {request.sent ? (
            <DialogSuccessPanel
              title="Check your email"
              description={`We sent a password reset link to ${request.sentTo ?? "your email"}.`}
            />
          ) : (
            <AuthCredentialsForm
              fields={REQUEST_FIELDS}
              form={request.form}
              onSubmit={request.submit}
              isSubmitting={request.isSubmitting}
              submitLabel="Send reset link"
              submittingLabel="Sending..."
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AuthFormShell>
  );
}
