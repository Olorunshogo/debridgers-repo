import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { AppLogo, SubmitButton } from "@debridgers/ui-web";
import AuthSuccessModal from "../../components/auth/AuthSuccessModal";
import { BASE_BACKEND_URL } from "../../utils/api";

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

const RESEND_COOLDOWN = 60;
const MAX_RESENDS = 2;
const OTP_LENGTH = 6;

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { email?: string; role?: string } | null;
  const email = state?.email ?? "";
  const role = state?.role ?? "buyer";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // === Resend state
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resendCount, setResendCount] = useState<number>(0);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [maxResendReached, setMaxResendReached] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first slot on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const allFilled = digits.every((d) => d !== "");

  const redirectUrl =
    role === "agent"
      ? "/agent-dashboard"
      : role === "admin"
        ? "/admin-dashboard"
        : "/dashboard";

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[index] = digit;
      setDigits(next);
      if (apiError) setApiError(null);
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, apiError],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index] !== "") {
          const next = [...digits];
          next[index] = "";
          setDigits(next);
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);
      if (!pasted) return;
      const next = Array(OTP_LENGTH).fill("");
      pasted.split("").forEach((ch, i) => {
        next[i] = ch;
      });
      setDigits(next);
      if (apiError) setApiError(null);
      // Focus last filled slot or last slot
      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [apiError],
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled || loading) return;
    setApiError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_BACKEND_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp: digits.join("") }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.message ?? "Verification failed. Please try again.");
        return;
      }
      setShowSuccess(true);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Resend ────────────────────────────────────────────────────────────────

  async function handleResend() {
    if (resendCooldown > 0 || resendLoading || maxResendReached) return;
    setResendLoading(true);
    setApiError(null);
    try {
      await fetch(`${BASE_BACKEND_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
    } catch {
      // silently ignore resend errors
    } finally {
      setResendLoading(false);
      const newCount = resendCount + 1;
      setResendCount(newCount);
      if (newCount >= MAX_RESENDS) {
        setMaxResendReached(true);
      } else {
        setResendCooldown(RESEND_COOLDOWN);
      }
    }
  }

  // ── Slot style ────────────────────────────────────────────────────────────

  function slotStyle(index: number): React.CSSProperties {
    return {
      width: 48,
      height: 52,
      borderRadius: 8,
      border: `1.5px solid ${focusedIndex === index ? "var(--primary-color)" : "var(--border-gray)"}`,
      textAlign: "center" as const,
      fontSize: "1.25rem",
      fontWeight: 600,
      color: "var(--heading-colour)",
      background: "white",
      outline: "none",
      transition: "border-color 0.15s",
    };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {showSuccess && (
          <AuthSuccessModal
            title="Email Verified"
            description="Your email has been verified successfully."
            submitButtonText="Go to Dashboard"
            redirectUrl={redirectUrl}
          />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen w-full">
        {/* Brand panel */}
        <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-[45%]">
          <Link to="/" className="mb-12 flex items-center gap-2">
            <span className="font-syne text-xl font-bold text-white">
              Debridgers
            </span>
          </Link>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
              One step away
              <br />
              from fresh food,
              <br />
              <span className="text-secondary">delivered.</span>
            </h2>
            <p className="max-w-[80%] text-lg leading-relaxed text-white">
              Verify your email to start enjoying fresh food at market prices.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
          <div className="flex w-full max-w-[480px] flex-col gap-6">
            {/* Logo */}
            <div className="flex justify-center">
              <AppLogo />
            </div>

            {/* Heading */}
            <div className="flex flex-col gap-1">
              <h1
                className="font-syne text-2xl font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                Verify your email
              </h1>
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                Enter the 6-digit code we sent to{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {email || "your email"}
                </span>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              {/* OTP field label row */}
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--heading-colour)" }}
                >
                  Verification code
                </label>

                {/* Resend button */}
                {!maxResendReached && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="flex items-center gap-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{ color: "var(--primary-color)" }}
                  >
                    <RefreshCw
                      size={13}
                      className={resendLoading ? "animate-spin" : ""}
                    />
                    {resendLoading
                      ? "Resending..."
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Code"}
                  </button>
                )}
              </div>

              {/* OTP slots */}
              <div className="flex items-center gap-2">
                {/* Group 1 */}
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digits[i]}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(null)}
                      style={slotStyle(i)}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Separator */}
                <span
                  className="text-xl font-bold select-none"
                  style={{ color: "var(--border-gray)" }}
                >
                  -
                </span>

                {/* Group 2 */}
                <div className="flex gap-2">
                  {[3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digits[i]}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(null)}
                      style={slotStyle(i)}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Max resend message */}
              {maxResendReached && (
                <p className="text-xs" style={{ color: "var(--text-colour)" }}>
                  Maximum resend attempts reached.
                </p>
              )}

              {/* Inline error */}
              <AnimatePresence>
                {apiError && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      backgroundColor: "var(--status-cancelled-bg)",
                      color: "var(--status-cancelled-text)",
                    }}
                  >
                    {apiError}
                  </motion.p>
                )}
              </AnimatePresence>

              <SubmitButton
                loading={loading}
                loadingText="Verifying..."
                disabled={!allFilled}
                className="mt-2 w-full rounded-full"
              >
                Verify Email
              </SubmitButton>
            </form>

            <p
              className="text-center text-sm"
              style={{ color: "var(--text-colour)" }}
            >
              Wrong email?{" "}
              <Link
                to="/signup"
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--primary-color)" }}
              >
                Go back to sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
