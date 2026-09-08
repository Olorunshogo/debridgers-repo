import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { buildPageMeta } from "../../lib/seo";
import { AuthFormShell, AuthRoleButton } from "@debridgers/ui-web";
import {
  PUBLIC_ROLES,
  publicRoleAppPath,
  type PublicRole,
} from "../../features/auth/public-roles";
import { AUTH_IMAGES } from "../../features/auth/auth-images";

export function meta() {
  return buildPageMeta({
    title: "Create Account | Debridgers",
    description: "Choose your account type to create a Debridgers account.",
    path: "/signup",
    noIndex: true,
  });
}

function readRole(value: string | null): PublicRole | null {
  return PUBLIC_ROLES.some((role) => role.value === value)
    ? (value as PublicRole)
    : null;
}

/*
 * Marketing owns no auth of its own - it only asks which role's dashboard to send the visitor to.
 * Mirrors Stayar's landing-page signup: a role picker, not a form.
 * Driven by PUBLIC_ROLES so a new role is a config entry here, not new markup.
 * `?role=` short-circuits the picker: the agents page and other role-specific CTAs link straight to `/signup?role=agent`, and a visitor who already picked should not have to pick again.
 */
export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const preselectedRole: PublicRole | null = readRole(searchParams.get("role"));

  useEffect(() => {
    if (preselectedRole) {
      window.location.replace(publicRoleAppPath(preselectedRole, "signup"));
    }
  }, [preselectedRole]);

  if (preselectedRole) {
    return (
      <AuthFormShell heading="Taking you there" images={AUTH_IMAGES}>
        <p className="text-body text-sm">
          Redirecting you to {preselectedRole} sign up. If nothing happens,{" "}
          <a
            className="text-primary underline underline-offset-2"
            href={publicRoleAppPath(preselectedRole, "signup")}
          >
            continue here
          </a>
          .
        </p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell heading="Who are you joining us as?" images={AUTH_IMAGES}>
      <div className="flex flex-col gap-3">
        {PUBLIC_ROLES.map((role) => (
          <AuthRoleButton
            key={role.value}
            icon={role.icon}
            label={role.label}
            description={role.description}
            onClick={() => {
              window.location.href = publicRoleAppPath(role.value, "signup");
            }}
          />
        ))}
      </div>
    </AuthFormShell>
  );
}
