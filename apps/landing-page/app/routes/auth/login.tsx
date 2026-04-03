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
import type { JwtPayload } from "../../types/auth";

export function meta() {
  return [
    { title: "Sign In | Debridger" },
    { name: "description", content: "Sign in to your Debridger account." },
  ];
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type FormErrors = Partial<Record<keyof LoginForm, string>>;

function redirectPathForRole(role: string): string {
  if (role === "agent") return "/agent-dashboard";
  if (role === "admin") return "/admin-dashboard";
  return "/buyer-dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      // -- PRODUCTION --
      // const res = await fetch(`${BASE_BACKEND_URL}/auth/login`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify({ email: form.email, password: form.password }),
      // });
      // const json = await res.json();
      // if (!res.ok) { setApiError(json.message ?? "Invalid email or password"); return; }
      // const { accessToken } = json.data;
      // const decoded = decodeJwtPayload<JwtPayload>(accessToken);
      // navigate(redirectPathForRole(decoded?.role ?? "buyer"));

      // -- MOCK --
      await new Promise<void>((r) => setTimeout(r, 900));
      const role = form.email.startsWith("agent")
        ? "agent"
        : form.email.startsWith("admin")
          ? "admin"
          : "buyer";
      navigate(redirectPathForRole(role));
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div
        className="hidden flex-col justify-between p-12 lg:flex lg:w-[45%]"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <AppLogo />
        <div className="flex flex-col gap-6">
          <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
            Welcome back to{" "}
            <span style={{ color: "var(--secondary-color)" }}>Debridger.</span>
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-white/80">
            Fresh food at market prices, delivered to your door or shop.
          </p>
        </div>
        <div className="relative h-40 w-full overflow-hidden opacity-20">
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full border-24 border-white" />
          <div className="absolute -bottom-8 left-24 h-40 w-40 rounded-full border-16 border-white" />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <AppLogo />
          </div>

          <div className="mb-8 flex flex-col gap-1">
            <h1
              className="font-syne text-2xl font-bold"
              style={{ color: "var(--heading-colour)" }}
            >
              Sign in to your account
            </h1>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              No account?{" "}
              <Link
                to="/signup"
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--primary-color)" }}
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

            <div className="flex flex-col gap-1.5">
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
              className="mt-1 rounded-full"
            >
              Sign in
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
