import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  AppLogo,
  DashEmailInput,
  DashTextInput,
  DashPasswordInput,
  SubmitButton,
} from "@debridgers/ui-web";
import AuthSuccessModal from "../../components/auth/AuthSuccessModal";
import { BASE_BACKEND_URL } from "../../utils/api";

export function meta() {
  return [
    { title: "Forgot Password | Debridgers" },
    { name: "description", content: "Reset your Debridgers password." },
  ];
}

const TOKEN_TTL = 15 * 60 * 1000;

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const resetSchema = z
  .object({
    token: z.string().min(1, "Please enter your reset token."),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ForgotPasswordPage() {
  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [step1ApiError, setStep1ApiError] = useState<string | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);

  // Step 2 state
  const [tokenReceivedAt, setTokenReceivedAt] = useState<number>(0);
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [step2ApiError, setStep2ApiError] = useState<string | null>(null);
  const [step2Loading, setStep2Loading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep1ApiError(null);

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }
    setEmailError(undefined);
    setStep1Loading(true);

    try {
      const res = await fetch(`${BASE_BACKEND_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setTokenReceivedAt(Date.now());
        setStep(2);
      } else {
        const json = await res.json().catch(() => ({}));
        setStep1ApiError(
          (json as { message?: string }).message ?? "Something went wrong.",
        );
      }
    } catch {
      setStep1ApiError("Network error. Please try again.");
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep2ApiError(null);
    setTokenError(undefined);
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);

    if (!token) {
      setTokenError("Please enter your reset token.");
      setShowPasswordFields(false);
      return;
    }

    if (Date.now() - tokenReceivedAt >= TOKEN_TTL) {
      setTokenError("This token has expired. Please request a new one.");
      setShowPasswordFields(false);
      return;
    }

    const result = resetSchema.safeParse({ token, password, confirmPassword });
    if (!result.success) {
      const issues = result.error.issues;
      for (const issue of issues) {
        const field = issue.path[0];
        if (field === "token") setTokenError(issue.message);
        if (field === "password") setPasswordError(issue.message);
        if (field === "confirmPassword") setConfirmPasswordError(issue.message);
      }
      setShowPasswordFields(true);
      return;
    }

    setShowPasswordFields(true);
    setStep2Loading(true);

    try {
      const res = await fetch(`${BASE_BACKEND_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setShowSuccessModal(true);
      } else if (res.status === 401) {
        setStep2ApiError("This token is invalid or has expired.");
      } else {
        const json = await res.json().catch(() => ({}));
        setStep2ApiError(
          (json as { message?: string }).message ?? "Something went wrong.",
        );
      }
    } catch {
      setStep2ApiError("Network error. Please try again.");
    } finally {
      setStep2Loading(false);
    }
  }

  function handleTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    setToken(e.target.value);
    if (tokenError) setTokenError(undefined);
    // Reset password fields visibility when token changes
    setShowPasswordFields(false);
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);
  }

  function goBackToStep1() {
    setStep(1);
    setToken("");
    setTokenError(undefined);
    setPassword("");
    setPasswordError(undefined);
    setConfirmPassword("");
    setConfirmPasswordError(undefined);
    setShowPasswordFields(false);
    setStep2ApiError(null);
  }

  return (
    <>
      {showSuccessModal && (
        <AuthSuccessModal
          title="Password Reset"
          description="Your password has been updated successfully."
          submitButtonText="Sign In"
          redirectUrl="/login"
        />
      )}

      <div className="flex min-h-screen w-full items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <AppLogo />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h1
                    className="font-syne text-2xl font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    Forgot your password?
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Enter your email and we'll send you a reset token.
                  </p>
                </div>

                <form
                  onSubmit={handleStep1Submit}
                  noValidate
                  className="flex flex-col gap-5"
                >
                  <AnimatePresence>
                    {step1ApiError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{
                          backgroundColor: "var(--status-cancelled-bg)",
                          color: "var(--status-cancelled-text)",
                        }}
                      >
                        {step1ApiError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <DashEmailInput
                    label="Email address"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(undefined);
                    }}
                    error={emailError}
                    required
                  />

                  <SubmitButton
                    loading={step1Loading}
                    loadingText="Sending..."
                    className="rounded-full"
                  >
                    Send reset link
                  </SubmitButton>
                </form>

                <Link
                  to="/login"
                  className="text-center text-sm font-medium underline underline-offset-2"
                  style={{ color: "var(--text-colour)" }}
                >
                  Back to sign in
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h1
                    className="font-syne text-2xl font-bold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    Reset your password
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    Enter the token from your email and set a new password.
                  </p>
                </div>

                <form
                  onSubmit={handleStep2Submit}
                  noValidate
                  className="flex flex-col gap-5"
                >
                  <AnimatePresence>
                    {step2ApiError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{
                          backgroundColor: "var(--status-cancelled-bg)",
                          color: "var(--status-cancelled-text)",
                        }}
                      >
                        {step2ApiError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <DashTextInput
                    label="Reset token"
                    placeholder="Paste your reset token"
                    value={token}
                    onChange={handleTokenChange}
                    error={tokenError}
                    required
                  />

                  <AnimatePresence>
                    {showPasswordFields && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-5"
                      >
                        <DashPasswordInput
                          label="New password"
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError(undefined);
                          }}
                          error={passwordError}
                          required
                        />
                        <DashPasswordInput
                          label="Confirm new password"
                          placeholder="Repeat your password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmPasswordError)
                              setConfirmPasswordError(undefined);
                          }}
                          error={confirmPasswordError}
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <SubmitButton
                    loading={step2Loading}
                    loadingText="Resetting..."
                    className="rounded-full"
                  >
                    Reset password
                  </SubmitButton>
                </form>

                <button
                  type="button"
                  onClick={goBackToStep1}
                  className="text-center text-sm font-medium underline underline-offset-2"
                  style={{ color: "var(--text-colour)" }}
                >
                  Back to step 1
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
