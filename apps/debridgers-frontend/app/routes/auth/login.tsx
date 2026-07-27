import { Link } from "react-router";
import {
  AuthFormShell,
  AuthCredentialsForm,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { useLogin, type LoginVariant } from "../../features/auth";

export function meta() {
  return [
    { title: "Log In | Debridgers" },
    {
      name: "description",
      content:
        "Log in to your Debridgers account to manage orders, track deliveries and access your dashboard.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
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
  /*
   * Lets an admin route render this same page against the admin login endpoint.
   * The UI and logic are identical; only the endpoint differs.
   */
  variant?: LoginVariant;
}

export default function LoginPage({ variant = "public" }: LoginPageProps) {
  const { form, submit, apiError, isSubmitting } = useLogin({ variant });

  return (
    <AuthFormShell
      heading="Log in to your account"
      apiError={apiError}
      subheading={
        <>
          No account?{" "}
          <Link
            to="/signup"
            className="text-primary font-semibold underline underline-offset-2"
          >
            Sign up
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
