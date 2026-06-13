import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { z } from "zod";
import { useAuthActions } from "../../hooks/useAuthActions";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z
  .object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const { loginWithPassword, registerBuyer } = useAuthActions();
  const [tab, setTab] = useState<"login" | "signup">("login");

  const [loginForm, setLoginForm] = useState<{
    email: string;
    password: string;
  }>({
    email: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginApiError, setLoginApiError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const [signupForm, setSignupForm] = useState<{
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signupApiError, setSignupApiError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState<boolean>(false);

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoginApiError(null);
    setLoginErrors({});

    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setLoginErrors(errors);
      return;
    }

    setLoginLoading(true);
    try {
      await loginWithPassword(loginForm.email, loginForm.password);
      onSuccess();
    } catch (error) {
      setLoginApiError(
        error instanceof Error ? error.message : "Login failed.",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSignupApiError(null);
    setSignupErrors({});

    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setSignupErrors(errors);
      return;
    }

    setSignupLoading(true);
    try {
      const signupResult = await registerBuyer({
        fullName: signupForm.fullName,
        email: signupForm.email,
        password: signupForm.password,
      });

      if (signupResult.requiresEmailVerification) {
        setLoginApiError(
          "Account created! Check your email to verify, then log in.",
        );
        setTab("login");
        return;
      }

      onSuccess();
    } catch (error) {
      setSignupApiError(
        error instanceof Error ? error.message : "Signup failed.",
      );
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <motion.div
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative z-10 flex w-full max-w-200 flex-col rounded-2xl bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-syne text-heading text-xl font-bold">
            Sign in to checkout
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-black/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
          {(["login", "signup"] as const).map((currentTab) => (
            <button
              key={currentTab}
              type="button"
              onClick={() => setTab(currentTab)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                tab === currentTab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {currentTab === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-4"
            noValidate
          >
            {loginApiError && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {loginApiError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="you@example.com"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {loginErrors.email && (
                <p className="text-xs text-red-500">{loginErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Your password"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {loginErrors.password && (
                <p className="text-xs text-red-500">{loginErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="bg-primary mt-1 w-full cursor-pointer rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleSignup}
            className="flex flex-col gap-4"
            noValidate
          >
            {signupApiError && (
              <p
                className={`rounded-xl px-4 py-2.5 text-sm ${
                  signupApiError.includes("Check your email")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {signupApiError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">
                Full Name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={signupForm.fullName}
                onChange={(e) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                placeholder="Amina Musa"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {signupErrors.fullName && (
                <p className="text-xs text-red-500">{signupErrors.fullName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-heading text-sm font-medium">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={signupForm.email}
                onChange={(e) =>
                  setSignupForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="you@example.com"
                className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
              />
              {signupErrors.email && (
                <p className="text-xs text-red-500">{signupErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Min 8 chars"
                  className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
                />
                {signupErrors.password && (
                  <p className="text-xs text-red-500">
                    {signupErrors.password}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-heading text-sm font-medium">
                  Confirm
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signupForm.confirmPassword}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Repeat"
                  className="border-gray-border focus:border-primary rounded-xl border px-4 py-2.5 text-sm outline-none"
                />
                {signupErrors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {signupErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={signupLoading}
              className="bg-primary mt-1 w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {signupLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
