/*
 * Where each role's dashboard app actually lives.
 * Read from env rather than hardcoded so local dev points at each app's own Vite dev server while staging/production point at the real subdomains - see .env.development.
 */

type DashboardRole = "buyer" | "agent" | "admin";

const APP_URL: Record<DashboardRole, string> = {
  buyer: import.meta.env["VITE_BUYER_APP_URL"] as string,
  agent: import.meta.env["VITE_AGENT_APP_URL"] as string,
  admin: import.meta.env["VITE_ADMIN_APP_URL"] as string,
};

export function dashboardAppUrl(role: DashboardRole): string {
  return APP_URL[role];
}
