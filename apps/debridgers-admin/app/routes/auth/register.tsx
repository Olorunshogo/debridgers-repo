import { useState } from "react";
import { buildPageMeta } from "../../lib/seo";
import { useNavigate } from "react-router";
import { apiMutate } from "@debridgers/api-client";

export function meta() {
  return buildPageMeta({
    title: "Admin Registration | Debridgers",
    description: "Register as an admin with your invitation code",
    path: "/register",
    noIndex: true,
  });
}

export default function AdminRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    invite_code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState<boolean>(false);

  /*
   * No schema library here (plain useState, not react-hook-form), so validity is the same required/minLength constraints already on the inputs below, computed once for the submit button rather than left to the browser's own validation on click.
   */
  const isFormValid =
    formData.email.trim() !== "" &&
    formData.first_name.trim() !== "" &&
    formData.last_name.trim() !== "" &&
    formData.password.length >= 8 &&
    formData.invite_code.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiMutate<{
        user_id: number;
        email: string;
        admin_tier: string;
        admin_api_key: string;
      }>("/auth/admin/register", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          invite_code: formData.invite_code,
        }),
      });

      setApiKey(result.admin_api_key);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <span className="text-2xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Account Created!
              </h1>
              <p className="mt-2 text-gray-600">
                Your admin account has been successfully created.
              </p>
            </div>

            <div className="mb-6 rounded-lg bg-yellow-50 p-4">
              <p className="mb-3 text-sm font-semibold text-yellow-900">
                Save Your API Key
              </p>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  readOnly
                  className="w-full rounded border border-yellow-200 bg-white px-3 py-2 pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute top-2.5 right-3 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(apiKey);
                  setApiKeyCopied(true);
                  window.setTimeout(() => setApiKeyCopied(false), 2000);
                }}
                className="mt-2 w-full rounded border border-blue-200 bg-blue-50 py-2 text-sm text-blue-700 hover:bg-blue-100"
              >
                {apiKeyCopied ? "Copied" : "Copy to Clipboard"}
              </button>
              <p className="mt-3 text-xs text-yellow-800">
                This is the only time your API key will be shown. Store it
                securely.
              </p>
            </div>

            <button
              onClick={() => navigate("/admin-dashboard")}
              className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700"
            >
              Go to Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Registration
          </h1>
          <p className="mt-2 text-gray-600">
            Complete your admin account setup with your invitation code
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg bg-white p-8 shadow-sm"
        >
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 8 characters required
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Invitation Code
            </label>
            <input
              type="text"
              value={formData.invite_code}
              onChange={(e) =>
                setFormData({ ...formData, invite_code: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-xs focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="mt-6 w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Creating Account..." : "Create Admin Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Login as admin
          </a>
        </p>
      </div>
    </div>
  );
}
