import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AuthFormShell,
  AuthOtpInput,
  DialogSuccessPanel,
  SubmitButton,
  swappedContentVariants,
  swappedContentTransition,
} from "@debridgers/ui-web";
import { useEmailVerification } from "../../features/auth";

export function meta() {
  return [
    { title: "Verify Email | Debridgers" },
    {
      name: "description",
      content:
        "Verify your Debridgers email address using the 6-digit code we sent to your inbox to activate your account.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

const MAX_RESENDS = 2;

export default function VerifyEmailPage() {
  const location = useLocation();
  const state = location.state as { email?: string; role?: string } | null;
  const queryParams = new URLSearchParams(location.search);
  const email = state?.email ?? queryParams.get("email") ?? "";
  const queryOtp = queryParams.get("otp") ?? "";

  const {
    code,
    setCode,
    submit,
    resend,
    apiError,
    isSubmitting,
    isResending,
    resent,
    verified,
    cooldown,
    canResend,
    maxResendsReached,
  } = useEmailVerification({ email, maxResends: MAX_RESENDS });

  /*
   * A verification link can carry the code directly, so fill it and let
   * onComplete auto-submit rather than making the user retype what they clicked.
   */
  useEffect(() => {
    if (queryOtp) setCode(queryOtp);
  }, [queryOtp, setCode]);

  return (
    <AuthFormShell
      heading={verified ? "Email verified" : "Verify your email"}
      apiError={apiError}
      subheading={
        verified
          ? undefined
          : email
            ? `Enter the 6-digit code we sent to ${email}.`
            : "Enter the 6-digit code we sent to your email."
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={verified ? "done" : "form"}
          variants={swappedContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={swappedContentTransition}
          className="flex flex-col gap-6"
        >
          {verified ? (
            <DialogSuccessPanel
              title="You're all set"
              description="Taking you to your dashboard."
            />
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              noValidate
              className="flex flex-col gap-6"
            >
              <AuthOtpInput
                value={code}
                onChange={setCode}
                onComplete={() => void submit()}
                disabled={isSubmitting}
              />

              <SubmitButton
                variant="block"
                loading={isSubmitting}
                loadingText="Verifying..."
                className="rounded-full"
              >
                Verify email
              </SubmitButton>

              <div className="flex flex-col items-center gap-2 text-center">
                {resent && (
                  <p className="text-good-green text-xs">
                    A new code is on its way.
                  </p>
                )}

                {maxResendsReached ? (
                  <p className="text-body text-xs">
                    Resend limit reached. Please contact support.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void resend()}
                    disabled={!canResend || isResending}
                    className={`text-xs font-medium underline underline-offset-2 ${
                      canResend && !isResending
                        ? "text-primary cursor-pointer"
                        : "text-placeholder-text cursor-not-allowed"
                    }`}
                  >
                    {isResending
                      ? "Sending..."
                      : cooldown > 0
                        ? `Resend code in ${cooldown}s`
                        : "Resend code"}
                  </button>
                )}

                <Link
                  to="/login"
                  className="text-placeholder-text cursor-pointer text-xs underline underline-offset-2"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthFormShell>
  );
}
