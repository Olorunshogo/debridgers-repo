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
import { AUTH_IMAGES } from "../../features/auth/auth-image";
import { buildPageMeta } from "../../lib/seo";

export function meta() {
  return buildPageMeta({
    title: "Verify Email | Debridgers HR",
    description: "Verify your email to access Debridgers HR.",
    path: "/verify-email",
    noIndex: true,
  });
}

const MAX_RESENDS = 2;

export default function VerifyEmailPage() {
  const location = useLocation();
  const state = location.state as { email?: string } | null;
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
    isCodeComplete,
  } = useEmailVerification({ email, maxResends: MAX_RESENDS });

  useEffect(() => {
    if (queryOtp) setCode(queryOtp);
  }, [queryOtp, setCode]);

  return (
    <AuthFormShell
      heading={verified ? "Email verified" : "Verify your email"}
      images={AUTH_IMAGES}
      apiError={apiError}
      subheading={
        verified ? undefined : email ? (
          <>
            Enter the 6-digit code we sent to{" "}
            <span className="font-semibold">{email}</span>.
          </>
        ) : (
          "Enter the 6-digit code we sent to your email."
        )
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
                disabled={isSubmitting}
              />

              <div className="flex flex-col gap-3">
                <SubmitButton
                  variant="block"
                  loading={isSubmitting}
                  loadingText="Verifying..."
                  disabled={!isCodeComplete}
                  className="rounded-full"
                >
                  Verify email
                </SubmitButton>

                {!maxResendsReached && (
                  <div className="flex justify-end">
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
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 text-center">
                {resent && (
                  <p className="text-good-green text-xs">
                    A new code is on its way.
                  </p>
                )}

                {maxResendsReached && (
                  <p className="text-body text-xs">
                    Resend limit reached. Please contact support.
                  </p>
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
