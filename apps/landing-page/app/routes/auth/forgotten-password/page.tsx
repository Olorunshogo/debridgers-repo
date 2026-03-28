"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { EmailInput } from "~/components/input-fields/EmailInput";
import { toast } from "sonner";

const metadata = {
  title: "Forgot Password – Reset Securely",
  description:
    "Reset your Debridger password securely. We’ll send a reset link to your email.",

  keywords: [
    "forgot password",
    "password reset",
    "recover account",
    "Debridger password",
  ],

  openGraph: {
    url: "/forgotten-password",
    title: "Forgot Password – Reset Securely | Debridger",
    description: "Get back into your account in seconds.",
  },

  twitter: {
    title: "Forgot Password – Reset Securely | Debridger",
    description: "Get back into your account in seconds.",
  },

  alternates: { canonical: "/forgotten-password" },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setSent(true);
      toast.success("Reset link sent to your email!");
    } else {
      toast.error("Email not found");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="mt-4 text-gray-600">
            We sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h2 className="mb-6 text-center text-2xl font-bold">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <EmailInput
            label="Email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-(--debridger-green-dark) hover:bg-(--debridger-green-light)"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
