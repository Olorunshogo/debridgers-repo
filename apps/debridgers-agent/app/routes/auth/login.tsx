import { Link } from "react-router";
import {
  AuthFormShell,
  AuthCredentialsForm,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { useLogin, type LoginVariant } from "../../features/auth";
import { AUTH_IMAGES } from "../../features/auth/auth-image";

import { buildPageMeta } from "../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Log In | Debridgers",
    description:
      "Log in to your Debridgers account to manage orders, track deliveries and access your dashboard.",
    path: "/login",
    noIndex: true,
  });
}

const LOGIN_FIELDS: readonly AuthFieldDescriptor[] = [
  {
    name: "email",
    label: "Email address",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Your password",
    autoComplete: "current-password",
  },
];

interface LoginPageProps {
  variant?: LoginVariant;
}

export default function LoginPage({ variant = "public" }: LoginPageProps) {
  const { form, submit, apiError, isSubmitting } = useLogin({ variant });

  return (
    <AuthFormShell
      heading="Log in to your account"
      images={AUTH_IMAGES}
      apiError={apiError}
      subheading={
        <>
          No account?{" "}
          <Link
            to="/signup"
            className="text-primary font-semibold underline underline-offset-2"
          >
            Apply as an agent
          </Link>
        </>
      }
    >
      <AuthCredentialsForm
        fields={LOGIN_FIELDS}
        form={form}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        submitLabel="Log In"
        submittingLabel="Logging in..."
        footer={
          <Link
            to="/forgot-password"
            className="text-primary self-end text-xs font-medium underline underline-offset-2"
          >
            Forgot password?
          </Link>
        }
      />
    </AuthFormShell>
  );
}
