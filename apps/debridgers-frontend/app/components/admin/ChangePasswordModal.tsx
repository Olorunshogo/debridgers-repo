import { useState } from "react";
import type { JSX } from "react";
import { apiMutate } from "@debridgers/api-client";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  validatePasswordForm,
  type ChangePasswordForm,
} from "../../utils/password-validation";

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

/**
 * Modal for changing admin password after initial login.
 * Cannot be dismissed and forces password change before continuing.
 */
export function ChangePasswordModal({
  isOpen,
  onSuccess,
}: ChangePasswordModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<ChangePasswordForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<Partial<ChangePasswordForm>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  function validateForm(): boolean {
    const validationErrors = validatePasswordForm(formData);
    if (Object.keys(validationErrors).length === 0) {
      setErrors({});
      return true;
    }
    setErrors(validationErrors);
    return false;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    if (!validateForm()) return;

    setError("");
    setLoading(true);

    try {
      await apiMutate("/admin/password/change", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: formData.current_password,
          new_password: formData.new_password,
        }),
      });
      setSuccess(true);

      // Show success before closing
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Password change failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-linear-to-r from-green-600 to-green-600/80 px-8 py-6 text-center">
            <CheckCircle size={56} className="mx-auto mb-3 text-white" />
            <h2 className="font-syne text-2xl font-bold text-white">
              Success!
            </h2>
          </div>
          <div className="p-8 text-center">
            <p className="mb-2 text-gray-700">
              Your password has been updated successfully.
            </p>
            <p className="text-sm text-gray-500">Closing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="from-primary to-primary/80 bg-linear-to-r px-8 py-6">
          <h2 className="font-syne mb-1 text-2xl font-bold text-white">
            Secure Your Account
          </h2>
          <p className="text-sm text-white/90">
            Create a permanent password to continue
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                Temporary Password
              </label>
              <input
                type="password"
                value={formData.current_password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_password: e.target.value,
                  })
                }
                placeholder="Enter temporary password"
                className={`rounded-lg border-2 px-4 py-3 text-sm transition focus:outline-none ${
                  errors.current_password
                    ? "border-red-300 focus:border-red-500"
                    : "focus:border-primary border-gray-200"
                }`}
                disabled={loading}
              />
              {errors.current_password && (
                <p className="text-xs text-red-600">
                  {errors.current_password}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <label className="text-sm font-semibold text-gray-700">
                New Password
              </label>
              <div className="flex flex-col gap-3">
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) =>
                    setFormData({ ...formData, new_password: e.target.value })
                  }
                  placeholder="Create new password"
                  className={`rounded-lg border-2 px-4 py-3 text-sm transition focus:outline-none ${
                    errors.new_password
                      ? "border-red-300 focus:border-red-500"
                      : "focus:border-primary border-gray-200"
                  }`}
                  disabled={loading}
                />
                {errors.new_password && (
                  <p className="text-xs text-red-600">{errors.new_password}</p>
                )}

                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirm_password: e.target.value,
                    })
                  }
                  placeholder="Confirm password"
                  className={`rounded-lg border-2 px-4 py-3 text-sm transition focus:outline-none ${
                    errors.confirm_password
                      ? "border-red-300 focus:border-red-500"
                      : "focus:border-primary border-gray-200"
                  }`}
                  disabled={loading}
                />
                {errors.confirm_password && (
                  <p className="text-xs text-red-600">
                    {errors.confirm_password}
                  </p>
                )}
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

          <p className="mt-6 border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
            8+ characters, uppercase, number, and special character required
          </p>
        </div>
      </div>
    </div>
  );
}
