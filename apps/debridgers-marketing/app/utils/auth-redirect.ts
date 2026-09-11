import { dashboardAppUrl } from "./app-urls";

type DashboardRole = "admin" | "agent" | "buyer" | "hr";

/*
 * debridgers-marketing has no dashboards of its own - every role's dashboard
 * lives on a separate subdomain app with its own session, so "after auth"
 * here always means an external redirect to that app's own /login, never an
 * in-app navigate(). A signup here still has to log in fresh over there;
 * verification alone issues no session on that origin.
 */
export function redirectAfterAuth(role: string): void {
  const base = dashboardAppUrl(
    (["admin", "agent", "buyer", "hr"] as const).includes(role as DashboardRole)
      ? (role as DashboardRole)
      : "buyer",
  );

  window.location.href = `${base}/login`;
}
