import { useState, useEffect } from "react";
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
import { useForgotPassword, useResetPassword } from "../../features/auth";

export function meta() {
  return [
    { title: "Forgot Password | Debridgers" },
    {
      name: "description",
      content:
        "Reset your Debridgers account password. We'll email you a reset code to set a new password.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
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

const RESET_FIELDS: readonly AuthFieldDescriptor[] = [
  {
    name: "token",
    label: "Reset code",
    type: "text",
    placeholder: "Code from your email",
    autoComplete: "one-time-code",
  },
  {
    name: "password",
    label: "New password",
    type: "password",
    placeholder: "Create a new password",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    type: "password",
    placeholder: "Repeat your password",
    autoComplete: "new-password",
  },
];

/*
 * Two steps: request the reset code, then use it. Each step is one hook, so this
 * page holds only the step marker. Which step is showing is genuinely page UI
 * state, unlike the form and request state the hooks own.
 */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);

  const request = useForgotPassword();
  const reset = useResetPassword();

  // Advance once the code has actually been sent
  useEffect(() => {
    if (request.sent) setStep(2);
  }, [request.sent]);

  const isRequestStep = step === 1;
  const activeError = isRequestStep ? request.apiError : reset.apiError;

  function restart(): void {
    request.reset();
    setStep(1);
  }

  return (
    <AuthFormShell
      heading={isRequestStep ? "Forgot your password?" : "Set a new password"}
      apiError={activeError}
      subheading={
        isRequestStep ? (
          <>
            Remembered it?{" "}
            <Link
              to="/login"
              className="text-primary font-semibold underline underline-offset-2"
            >
              Log in
            </Link>
          </>
        ) : (
          `Enter the code we sent to ${request.sentTo ?? "your email"}.`
        )
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={reset.done ? "done" : step}
          variants={swappedContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={swappedContentTransition}
        >
          {reset.done ? (
            <DialogSuccessPanel
              title="Password updated"
              description="You can now log in with your new password."
            />
          ) : isRequestStep ? (
            <AuthCredentialsForm
              fields={REQUEST_FIELDS}
              form={request.form}
              onSubmit={request.submit}
              isSubmitting={request.isSubmitting}
              submitLabel="Send reset code"
              submittingLabel="Sending..."
            />
          ) : (
            <AuthCredentialsForm
              fields={RESET_FIELDS}
              form={reset.form}
              onSubmit={reset.submit}
              isSubmitting={reset.isSubmitting}
              submitLabel="Update password"
              submittingLabel="Updating..."
              footer={
                <button
                  type="button"
                  onClick={restart}
                  className="text-primary cursor-pointer self-end text-xs font-medium underline underline-offset-2"
                >
                  Use a different email
                </button>
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AuthFormShell>
  );
}
