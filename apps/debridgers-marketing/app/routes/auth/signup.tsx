import { buildPageMeta } from "../../lib/seo";
import { AuthFormShell, AuthRoleButton } from "@debridgers/ui-web";
import {
  PUBLIC_ROLES,
  publicRoleAppPath,
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

/*
 * Marketing owns no auth of its own - it only asks which role's dashboard to
 * send the visitor to. Mirrors Stayar's landing-page signup: a role picker,
 * not a form. Driven by PUBLIC_ROLES so a new role is a config entry here,
 * not new markup.
 */
export default function SignupPage() {
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
