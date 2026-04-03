import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { AppLogo, DashEmailInput, SubmitButton } from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "../../utils/api";

export function meta() {
  return [
    { title: "Forgot Password | Debridger" },
    { name: "description", content: "Reset your Debridger password." },
  ];
}

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = schema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }
    setEmailError(undefined);
    setLoading(true);

    try {
      // -- PRODUCTION --
      // const res = await fetch(`${BASE_BACKEND_URL}/auth/forgot-password`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // });
      // const json = await res.json();
      // if (!res.ok) { setApiError(json.message ?? "Something went wrong"); return; }
      // setSent(true);

      // -- MOCK --
      await new Promise<void>((r) => setTimeout(r, 900));
      setSent(true);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AppLogo />
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <CheckCircle2
                size={48}
                style={{ color: "var(--primary-color)" }}
              />
              <h1
                className="font-syne text-2xl font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                Check your email
              </h1>
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                We sent a reset link to{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {email}
                </span>
                . It expires in 1 hour.
              </p>
              <Link
                to="/login"
                className="mt-2 text-sm font-semibold underline underline-offset-2"
                style={{ color: "var(--primary-color)" }}
              >
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1">
                <h1
                  className="font-syne text-2xl font-bold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  Forgot your password?
                </h1>
                <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                  Enter your email and we will send you a reset link.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-5"
              >
                <AnimatePresence>
                  {apiError && (
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
                      {apiError}
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
                  loading={loading}
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
