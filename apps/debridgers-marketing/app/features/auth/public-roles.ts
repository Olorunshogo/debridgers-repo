import { dashboardAppUrl } from "../../utils/app-urls";

/*
 * The public entry points marketing advertises. Admin deliberately isn't
 * here - its login/register URLs are unadvertised on purpose, matching the
 * old routes.ts comment this replaces.
 */
export type PublicRole = "buyer" | "agent";

export interface PublicRoleOption {
  value: PublicRole;
  label: string;
  description: string;
}

export const PUBLIC_ROLES: readonly PublicRoleOption[] = [
  {
    value: "buyer",
    label: "Buyer",
    description: "Order fresh foodstuff at market prices, delivered to you.",
  },
  {
    value: "agent",
    label: "Agent",
    description: "Sell in the field and earn commission.",
  },
];

/*
 * Marketing has no auth of its own - every role's real login/signup lives on
 * that role's own subdomain app, so choosing a role here is always an
 * external redirect, never an in-app route change.
 */
export function publicRoleAppPath(
  role: PublicRole,
  path: "login" | "signup",
): string {
  return `${dashboardAppUrl(role)}/${path}`;
}
