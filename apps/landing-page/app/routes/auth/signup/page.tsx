"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { toast, Toaster } from "sonner";
import AppLogo from "~/components/AppLogo";
import { EmailInput } from "~/components/input-fields/EmailInput";
import { PasswordInput } from "~/components/input-fields/PasswordInput";
import { SubmitButton } from "~/components/SubmitButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

const signUpSchema = z
  .object({
    role: z.enum(["buyer", "farmer"]),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpForm = z.infer<typeof signUpSchema>;
type FormErrors = Partial<Record<keyof SignUpForm, string>>;

export default function SignUpPage() {
  const router = useRouter();

  const [step, setStep] = useState<"role" | "form">("role");
  const [role, setRole] = useState<"buyer" | "farmer" | null>(null);

  const [form, setForm] = useState<Omit<SignUpForm, "role">>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Live password match feedback
  const passwordMismatch =
    form.password &&
    form.confirmPassword &&
    form.password !== form.confirmPassword;

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  // useEffect(() => {
  //   if (passwordMismatch) {
  //     setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
  //   } else {
  //     setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  //   }
  // }, [form.password, form.confirmPassword]);

  // Track when user has interacted with fields
  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));

      // Mark field as touched on first input
      if (value.length > 0) {
        setTouched((prev) => ({ ...prev, [field]: true }));
      }

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const shouldShowMismatchError =
    touched.password &&
    touched.confirmPassword &&
    form.password.length >= 8 &&
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword;

  useEffect(() => {
    if (shouldShowMismatchError) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: undefined,
      }));
    }
  }, [shouldShowMismatchError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) return;

    const fullFormData: SignUpForm = { ...form, role };
    const result = signUpSchema.safeParse(fullFormData);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormErrors;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.email) {
        // toast.success("Account created! Please check your email to verify.");
        // router.push("/signin");
        router.push(
          `/signup-verification?email=${encodeURIComponent(data.email)}`,
        );
      } else {
        toast.error(data.message || "Signup failed");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Role Selection (matches your screenshot)
  if (step === "role") {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="font-inter flex min-h-screen items-center justify-center">
          <div className="flex w-full max-w-xl flex-col gap-8 p-6 lg:p-8">
            <Link href="/" className="mx-auto flex items-center gap-2">
              <AppLogo />
            </Link>

            <h1 className="text-center text-2xl font-semibold text-(--heading-colour)">
              Join Debridger
            </h1>
            <p className="text-center text-(--text-colour)">
              Choose your role to get started
            </p>

            <div className="flex flex-col gap-4">
              <Button
                onClick={() => {
                  setRole("buyer");
                  setStep("form");
                }}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-(--debridger-green-dark) text-lg font-medium text-white hover:bg-(--debridger-green-dark)/90"
              >
                <div className="text-3xl">👤</div>
                Buyer
                <span className="text-sm font-normal">Looking for a home</span>
              </Button>

              <Button
                onClick={() => {
                  setRole("farmer");
                  setStep("form");
                }}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-(--debridger-green-dark) text-lg font-medium text-white hover:bg-(--debridger-green-dark)/90"
              >
                <div className="text-3xl">🌾</div>
                Farmer
                <span className="text-sm font-normal">Listing properties</span>
              </Button>
            </div>

            <p className="text-center text-sm text-(--text-colour)">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-bold text-(--debridger-green-dark) hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  // Step 2: Signup Form
  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="font-inter flex min-h-screen items-center justify-center">
        <div className="flex w-full max-w-xl flex-col gap-6 p-6 lg:p-8">
          <Link href="/" className="mx-auto flex items-center gap-2">
            <AppLogo />
          </Link>

          <h2 className="text-center text-xl font-semibold text-(--heading-colour)">
            Sign Up as a {role === "buyer" ? "Buyer" : "Farmer"}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <EmailInput
                label="Email"
                placeholder="example@example.com"
                required
                value={form.email}
                onChange={handleChange("email")}
                error={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-(--input-error-red)">
                  {errors.email}
                </p>
              )}

              <PasswordInput
                label="Password"
                placeholder="Abcdefghi124$"
                required
                value={form.password}
                onChange={handleChange("password")}
                error={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-(--input-error-red)">
                  {errors.password}
                </p>
              )}

              <PasswordInput
                label="Confirm Password"
                placeholder="************"
                required
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                error={!!errors.confirmPassword}
              />
              {shouldShowMismatchError ? (
                <p className="text-sm text-(--input-error-red)">
                  Passwords do not match
                </p>
              ) : errors.confirmPassword ? (
                <p className="text-sm text-(--input-error-red)">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>

            <SubmitButton loading={loading} loadingText="Creating Account...">
              Sign Up
            </SubmitButton>
          </form>

          <p className="text-center text-sm text-(--text-colour)">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-bold text-(--debridger-green-dark) hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
