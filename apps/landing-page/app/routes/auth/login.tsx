import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  AppLogo,
  DashEmailInput,
  DashPasswordInput,
  SubmitButton,
} from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "../../utils/api";
import { decodeJwtPayload } from "../../utils/auth-cookies";
import { redirectAfterAuth } from "../../utils/auth-redirect";
import { storeTokens } from "../../lib/auth";
import type { JwtPayload } from "../../types/auth";

export function meta() {
  return [
    { title: "Sign In | Debridgers" },
    {
      name: "description",
      content:
        "Sign in to your Debridgers account to manage orders, track deliveries and access your dashboard.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type FormErrors = Partial<Record<keyof LoginForm, string>>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  function handleChange(field: keyof LoginForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
      if (apiError) setApiError(null);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof LoginForm] = i.message;
      });
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setApiError("Invalid email or password.");
        return;
      }
      if (!res.ok) {
        setApiError(json.message ?? "Something went wrong. Please try again.");
        return;
      }
      storeTokens(json.data.accessToken, json.data.refreshToken);
      const decoded = decodeJwtPayload<JwtPayload>(json.data.accessToken);
      redirectAfterAuth(navigate, decoded?.role ?? "buyer");
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-[45%]">
        <div className="flex w-full flex-col gap-12">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-syne text-xl font-bold text-white">
              Debridgers
            </span>
          </Link>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
              Welcome back to{" "}
              <span className="text-secondary">Debridgers.</span>
            </h2>
            <p className="max-w-[80%] text-lg leading-relaxed text-white">
              Fresh food at market prices, delivered to your door step.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="flex w-full max-w-[500px] flex-col gap-6">
          <div className="flex justify-center lg:hidden">
            <AppLogo />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-syne text-heading text-2xl font-bold">
              Sign in to your account
            </h1>
            <p className="text-text text-sm">
              No account?{" "}
              <Link
                to="/signup"
                className="text-primary font-semibold underline underline-offset-2"
              >
                Sign up
              </Link>
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
              value={form.email}
              onChange={handleChange("email")}
              error={errors.email}
              required
              autoComplete="email"
            />

            <div className="flex flex-col gap-2">
              <DashPasswordInput
                label="Password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange("password")}
                error={errors.password}
                required
                autoComplete="current-password"
              />
              <Link
                to="/forgot-password"
                className="self-end text-xs font-medium underline underline-offset-2"
                style={{ color: "var(--primary-color)" }}
              >
                Forgot password?
              </Link>
            </div>

            <SubmitButton
              loading={loading}
              loadingText="Signing in..."
              className="mt-4 rounded-full"
            >
              Sign in
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
