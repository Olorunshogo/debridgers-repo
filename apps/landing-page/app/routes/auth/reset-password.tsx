import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { AppLogo, DashPasswordInput, SubmitButton } from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "../../utils/api";

export function meta() {
  return [
    { title: "Reset Password | Debridgers" },
    {
      name: "description",
      content:
        "Set a new password for your Debridgers account. Use the reset token sent to your email to complete the process.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof ResetForm, string>>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState<ResetForm>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  function handleChange(field: keyof ResetForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
      if (apiError) setApiError(null);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof ResetForm] = i.message;
      });
      setErrors(errs);
      return;
    }

    if (!token) {
      setApiError(
        "Reset token is missing. Please use the link from your email.",
      );
      return;
    }

    setLoading(true);
    try {
      // === PRODUCTION
      // const res = await fetch(`${BASE_BACKEND_URL}/auth/reset-password`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ token, password: form.password }),
      // });
      // const json = await res.json();
      // if (!res.ok) {
      //   setApiError(json.message ?? "Invalid or expired token");
      //   return;
      // }
      // setDone(true);

      // === MOCK
      await new Promise<void>((r) => setTimeout(r, 900));
      setDone(true);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-12">
      <div className="flex w-full max-w-[600px] flex-col gap-8">
        <Link to="/" className="flex justify-center">
          <AppLogo />
        </Link>

        <AnimatePresence mode="sync">
          {done ? (
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
                Password updated
              </h1>
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                Your password has been reset successfully.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                Sign in
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
                  Set a new password
                </h1>
                <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                  Must be at least 8 characters.
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

                <DashPasswordInput
                  label="New password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange("password")}
                  error={errors.password}
                  required
                />
                <DashPasswordInput
                  label="Confirm new password"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  error={errors.confirmPassword}
                  required
                />

                <SubmitButton
                  loading={loading}
                  loadingText="Updating..."
                  className="rounded-full"
                >
                  Update password
                </SubmitButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
