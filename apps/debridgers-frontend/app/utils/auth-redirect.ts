import type { NavigateFunction } from "react-router";

type UserRole = "admin" | "agent" | "buyer";

const ROLE_PATHS: Record<UserRole, string> = {
  admin: "/admin-dashboard",
  agent: "/agent-dashboard",
  buyer: "/buyer-dashboard",
};

/**
 * Navigates the user to the correct dashboard based on their role.
 * Falls back to buyer dashboard for unknown roles.
 */
export function redirectAfterAuth(navigate: NavigateFunction, role: string) {
  const path = ROLE_PATHS[role as UserRole] ?? ROLE_PATHS.buyer;
  navigate(path);
}
