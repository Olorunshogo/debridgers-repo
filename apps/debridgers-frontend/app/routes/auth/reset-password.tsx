import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { AppLogo, DashPasswordInput, SubmitButton } from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "@debridgers/api-client";

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
      const res = await fetch(`${BASE_BACKEND_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: result.data.password }),
      });
      if (res.ok) {
        setDone(true);
      } else if (res.status === 401) {
        setApiError("This token is invalid or has expired.");
      } else {
        const json = await res.json().catch(() => ({}));
        setApiError(
          (json as { message?: string }).message ?? "Something went wrong.",
        );
      }
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-100">
        <Link to="/" className="mb-12 flex items-center gap-2">
          <span className="font-syne text-xl font-bold text-white">
            Debridgers
          </span>
        </Link>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <h2 className="font-syne text-4xl leading-tight font-bold text-white xl:text-5xl">
            Almost there,
            <br />
            you&apos;re nearly
            <br />
            <span className="text-secondary">back in.</span>
          </h2>
          <p className="max-w-80 text-lg leading-relaxed text-white">
            Set a strong new password to secure your account.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="flex w-full max-w-120 flex-col gap-8">
          <Link to="/" className="flex justify-center lg:hidden">
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
                <CheckCircle2 size={48} className="text-primary" />
                <h1 className="font-syne text-heading text-2xl font-bold">
                  Password updated
                </h1>
                <p className="text-text text-sm">
                  Your password has been reset successfully.
                </p>
                <Link
                  to="/login"
                  className="bg-primary mt-2 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
                  <h1 className="font-syne text-heading text-2xl font-bold">
                    Set a new password
                  </h1>
                  <p className="text-text text-sm">
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
                        className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm"
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
    </div>
  );
}
