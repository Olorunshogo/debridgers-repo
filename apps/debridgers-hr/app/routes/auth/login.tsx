import { Link } from "react-router";
import {
  AuthFormShell,
  AuthCredentialsForm,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { useLogin } from "../../features/auth";
import { AUTH_IMAGES } from "../../features/auth/auth-image";
import { buildPageMeta } from "../../lib/seo";

export function meta() {
  return buildPageMeta({
    title: "Log In | Debridgers HR",
    description: "Log in to Debridgers HR.",
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

export default function LoginPage() {
  const {
    form,
    submit,
    apiError,
    isSubmitting,
    unverifiedEmail,
    goToVerifyEmail,
  } = useLogin({
    variant: "public",
  });

  return (
    <AuthFormShell
      heading="People & recruitment"
      images={AUTH_IMAGES}
      apiError={apiError}
      unverifiedEmail={unverifiedEmail}
      onVerifyEmail={unverifiedEmail ? goToVerifyEmail : undefined}
      subheading={
        <>
          Looking for open roles?{" "}
          <Link
            to="/careers"
            className="text-primary font-semibold underline underline-offset-2"
          >
            View careers
          </Link>
        </>
      }
    >
      <AuthCredentialsForm
        fields={LOGIN_FIELDS}
        form={form}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        submitLabel="Sign in"
        submittingLabel="Signing in..."
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
