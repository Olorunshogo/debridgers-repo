import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildPageMeta } from "../../lib/seo";
import { useNavigate } from "react-router";
import { apiMutate } from "@debridgers/api-client";
import {
  TextInputField,
  EmailInputField,
  PasswordInputField,
  SubmitButton,
  applyServerFieldErrors,
  adminRegisterSchema,
  type AdminRegisterValues,
} from "@debridgers/ui-web";

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
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState<boolean>(false);

  const form = useForm<AdminRegisterValues>({
    resolver: zodResolver(adminRegisterSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      inviteCode: "",
    },
  });

  const {
    register,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const handleSubmit = form.handleSubmit(async (values) => {
    setError("");

    try {
      const result = await apiMutate<{
        user_id: number;
        email: string;
        admin_tier: string;
        admin_api_key: string;
      }>("/auth/admin/register", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          first_name: values.firstName,
          last_name: values.lastName,
          invite_code: values.inviteCode,
        }),
      });

      setApiKey(result.admin_api_key);
    } catch (err) {
      applyServerFieldErrors(err, form);
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
    }
  });

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

          <EmailInputField
            label="Email Address"
            required
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInputField
              label="First Name"
              required
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <TextInputField
              label="Last Name"
              required
              error={errors.lastName?.message}
              {...register("lastName")}
            />
          </div>

          <div>
            <PasswordInputField
              label="Password"
              required
              minLength={8}
              error={errors.password?.message}
              {...register("password")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 8 characters required
            </p>
          </div>

          <TextInputField
            label="Invitation Code"
            required
            className="font-mono"
            error={errors.inviteCode?.message}
            {...register("inviteCode")}
          />

          <SubmitButton
            fullWidth
            disabled={!isValid}
            loading={isSubmitting}
            loadingText="Creating Account..."
            className="mt-6"
          >
            Create Admin Account
          </SubmitButton>
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
