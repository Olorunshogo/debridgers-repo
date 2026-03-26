"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Toaster, toast } from "sonner";
import { EmailInput } from "~/components/input-fields/EmailInput";
import { PasswordInput } from "~/components/input-fields/PasswordInput";
import AppLogo from "~/components/AppLogo";
import { SubmitButton } from "~/components/SubmitButton";
import Link from "next/link";
import { Chrome } from "lucide-react";
import { z } from "zod";

const metadata = {
  title: "Sign In to Your Account",
  description:
    "Log in to Debridger to access verified Nigerian agricultural products and manage your orders.",

  keywords: [
    "Debridger login",
    "signin",
    "buyer login",
    "agricultural marketplace login",
  ],

  openGraph: {
    url: "/signin",
    title: "Sign In to Your Account | Debridger",
    description:
      "Access your buyer dashboard and start sourcing premium crops.",
  },

  twitter: {
    title: "Sign In to Your Account | Debridger",
    description:
      "Access your buyer dashboard and start sourcing premium crops.",
  },

  alternates: { canonical: "/signin" },
};

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();

  const [form, setForm] = useState<SignInForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<SignInForm>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange =
    (field: keyof SignInForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const validate = (): boolean => {
    const result = signInSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<SignInForm> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof SignInForm;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.redirectTo) {
        toast.success("Welcome back! Signed in successfully");
        // console.log("Welcome back! Signed in successfully");
        router.push(data.redirectTo);
        router.refresh();
      } else {
        toast.error(data.message || "Invalid email or password");
        // console.error(data.message || "Invalid email or password");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
      // console.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: "google" | "github") => {
    toast.info(`Sign in with ${provider} coming soon!`);
    // window.location.href = `/api/auth/${provider}`;
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="font-openSans flex h-full min-h-screen w-full items-center justify-center bg-(--primary-bg) p-4">
        <div className="flex h-full w-full max-w-md flex-col gap-6">
          {/* Heading, App Logo and Title*/}
          <div className="flex h-full w-full flex-col items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <AppLogo />
            </Link>

            <div className="text-xl font-semibold text-(--heading-colour)">
              Sign In
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="mb-8 flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-(--border-gray) text-base font-medium transition-all duration-300 ease-in-out hover:cursor-pointer hover:border-(--debridger-green-dark)"
              onClick={() => handleOAuth("google")}
            >
              <Chrome className="mr-3 h-5 w-5" />
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-(--primary-bg) px-4 text-(--text-colour)">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex h-full w-full flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <EmailInput
                label="Email Address"
                placeholder="you@example.com"
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
            </div>

            <div className="flex flex-col gap-2">
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
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

              <Link
                href="/forgot-password"
                className="self-end text-sm text-(--debridger-green-dark) hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Submit */}
            <SubmitButton loading={loading} loadingText="Signning in...">
              Sign In
            </SubmitButton>
          </form>

          {/* Footer */}
          <p className="mx-auto flex items-center text-center text-sm text-(--text-colour)">
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-(--debridger-green-dark) hover:underline"
            >
              &nbsp;Sign Up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
