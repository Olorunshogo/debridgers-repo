"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InputOTPField } from "~/components/input-fields/OTPInputField";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface Props {
  email: string;
}

export default function SignupVerificationClient({ email }: Props) {
  const router = useRouter();

  const [otp, setOtp] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);

        // Save to localStorage so useCurrentUser() can read it
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            email: data.email,
            role: data.role,
          }),
        );

        setTimeout(() => router.push(data.redirectTo || "/"), 2000);
      } else {
        console.log(data.message || "Invalid OTP");
        alert(data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error(error);
      alert("Verification failed");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-gray-600">
            We sent a 6-digit code to <strong>{email}</strong>
            <br />
            (In dev mode: check your server console)
          </p>

          <div className="flex flex-col gap-2">
            <InputOTPField
              value={otp}
              onChange={setOtp}
              length={6}
              data-error={!!error}
            />

            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length < 6 || success}
            className={`rounded-ld h-14 w-full bg-(--debridger-green-dark) font-bold text-white transition-all duration-300 ease-in-out hover:cursor-pointer hover:bg-(--debridger-green-dark) hover:opacity-90 ${loading || otp.length < 6 || success ? "cursor-not-allowed opacity-70" : ""} `}
          >
            {loading
              ? "Verifying..."
              : success
                ? "Verified! Redirecting..."
                : "Verify"}
          </Button>

          <p className="text-center text-xs text-gray-500">
            Didn&apos;t receive a code? Check console (dev) or try signing up
            again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
