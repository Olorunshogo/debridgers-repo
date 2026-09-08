import { useState } from "react";
import type { JSX } from "react";
import { apiMutate } from "@debridgers/api-client";
import { AlertCircle } from "lucide-react";

interface InviteVerificationModalProps {
  isOpen: boolean;
  onVerified: () => void;
}

export function InviteVerificationModal({
  isOpen,
  onVerified,
}: InviteVerificationModalProps): JSX.Element | null {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  async function handleVerify(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiMutate("/admin/invites/verify", {
        method: "POST",
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      onVerified();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="from-primary to-primary/80 bg-linear-to-r px-8 py-6">
          <h2 className="font-syne mb-1 text-2xl font-bold text-white">
            Verify Invite Code
          </h2>
          <p className="text-sm text-white/90">
            Complete this step to activate your account
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleVerify} className="flex flex-col gap-6">
            {error && (
              <section className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </section>
            )}

            <section className="flex flex-col gap-4">
              <label className="text-sm font-semibold text-gray-700">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Paste your 32-character code"
                className={`rounded-lg border-2 px-4 py-3 font-mono text-sm transition focus:outline-none ${
                  error
                    ? "border-red-300 focus:border-red-500"
                    : "focus:border-primary border-gray-200"
                }`}
                disabled={loading}
              />
            </section>

            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying...
                </span>
              ) : (
                "Verify Code"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-xs text-gray-600">
              <span className="mb-2 block font-medium">
                📧 Check Your Email
              </span>
              Your invite code was sent to your registered email address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
