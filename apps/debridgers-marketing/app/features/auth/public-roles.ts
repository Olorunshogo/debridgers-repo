import { ShoppingBag, Bike, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { dashboardAppUrl } from "../../utils/app-urls";

/*
 * The public entry points marketing advertises.
 * Admin deliberately isn't here - its login/register URLs are unadvertised on purpose, matching the old routes.ts comment this replaces.
 */
export type PublicRole = "buyer" | "agent" | "careers";

export interface PublicRoleOption {
  value: PublicRole;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const PUBLIC_ROLES: readonly PublicRoleOption[] = [
  {
    value: "buyer",
    label: "Buyer",
    description: "Order fresh foodstuff at market prices, delivered to you.",
    icon: ShoppingBag,
  },
  {
    value: "agent",
    label: "Agent",
    description: "Sell in the field and earn commission.",
    icon: Bike,
  },
  {
    value: "careers",
    label: "Careers",
    description: "Apply for a role, or manage people and recruitment.",
    icon: Users,
  },
];

/*
 * Marketing has no auth of its own - every role's real login/signup lives on that role's own subdomain app, so choosing a role here is always an external redirect, never an in-app route change.
 */
export function publicRoleAppPath(
  role: PublicRole,
  path: "login" | "signup",
): string {
  return `${dashboardAppUrl(role)}/${path}`;
}
