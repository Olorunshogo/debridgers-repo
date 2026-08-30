/*
 * Every frontend URL an email can link to, in one place.
 *
 * These used to be template literals scattered across email.service.ts, which
 * is how `${APP_URL}/agent/login` survived: there is no such route, so that
 * button has been a 404 in two live agent emails. A typo in a string spread
 * over 700 lines is invisible; a typo here is a compile error.
 *
 * When a route moves, this file is the only edit. Keep the keys in step with
 * apps/debridgers-frontend/app/routes.ts.
 */

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

function link(path: string): string {
  return `${appUrl()}${path}`;
}

export const emailLinks = {
  // === Auth
  login: (): string => link("/login"),
  adminLogin: (): string => link("/auth/admin/login"),
  verifyEmail: (email: string, otp: string): string =>
    link(
      `/verify-email?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
    ),
  resetPassword: (token: string): string =>
    link(`/reset-password?token=${encodeURIComponent(token)}`),

  // === Dashboards
  adminDashboard: (): string => link("/admin-dashboard"),
  agentDashboard: (): string => link("/agent-dashboard"),
  buyerWallet: (): string => link("/buyer-dashboard/wallet"),
  buyerOrders: (): string => link("/buyer-dashboard/orders"),

  // === Assets
  logoWhite: (): string => link("/logos/debridgers-white.png"),
} as const;
