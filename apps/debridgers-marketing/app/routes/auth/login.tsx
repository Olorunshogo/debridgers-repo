import { buildPageMeta } from "../../lib/seo";
import { AuthFormShell } from "@debridgers/ui-web";
import {
  PUBLIC_ROLES,
  publicRoleAppPath,
} from "../../features/auth/public-roles";

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
    <AuthFormShell heading="Log in to your account">
      <div className="flex flex-col gap-3">
        {PUBLIC_ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            onClick={() => {
              window.location.href = publicRoleAppPath(role.value, "login");
            }}
            className="hover:border-primary flex cursor-pointer flex-col gap-1 rounded-2xl border border-gray-300 px-5 py-4 text-left transition-colors"
          >
            <span className="font-syne text-heading font-semibold">
              {role.label}
            </span>
            <span className="text-body text-xs">{role.description}</span>
          </button>
        ))}
      </div>
    </AuthFormShell>
  );
}
