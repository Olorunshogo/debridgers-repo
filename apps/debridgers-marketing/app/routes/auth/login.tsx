import { buildPageMeta } from "../../lib/seo";
import { AuthFormShell, AuthRoleButton } from "@debridgers/ui-web";
import {
  PUBLIC_ROLES,
  publicRoleAppPath,
} from "../../features/auth/public-roles";
import { AUTH_IMAGES } from "../../features/auth/auth-images";

export function meta() {
  return buildPageMeta({
    title: "Log In | Debridgers",
    description: "Choose your account type to log in to Debridgers.",
    path: "/login",
    noIndex: true,
  });
}

/*
 * Marketing owns no auth of its own - it only asks which role's dashboard to
 * send the visitor to. Mirrors Stayar's landing-page login: a role picker,
 * not a form. Driven by PUBLIC_ROLES so a new role is a config entry here,
 * not new markup.
 */
export default function LoginPage() {
  return (
    <AuthFormShell heading="Log in to your account" images={AUTH_IMAGES}>
      <div className="flex flex-col gap-3">
        {PUBLIC_ROLES.map((role) => (
          <AuthRoleButton
            key={role.value}
            icon={role.icon}
            label={role.label}
            description={role.description}
            onClick={() => {
              window.location.href = publicRoleAppPath(role.value, "login");
            }}
          />
        ))}
      </div>
    </AuthFormShell>
  );
}
