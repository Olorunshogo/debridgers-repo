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
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/*
 * Emails are opened on the recipient's device, not ours. A logo URL that still
 * points at localhost (or that was frozen before ConfigModule loaded .env)
 * shows as a broken image in Gmail. Prefer a dedicated asset host, then APP_URL,
 * then the public marketing site which already serves /logos/*.
 */
function emailAssetUrl(): string {
  return (
    process.env.EMAIL_ASSET_URL ||
    process.env.APP_URL ||
    "https://debridgers.com"
  ).replace(/\/$/, "");
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
  buyerOrder: (reference: string): string =>
    link(`/buyer-dashboard/orders?ref=${encodeURIComponent(reference)}`),

  // === Assets (absolute, public — must resolve outside our network)
  logo: (): string => `${emailAssetUrl()}/logos/debridgers-black.png`,
  logoWhite: (): string => `${emailAssetUrl()}/logos/debridgers-white.png`,

  // === Support / social (absolute; emails cannot use relative paths)
  supportEmail: (): string => "support@debridgers.com",
  supportPhoneDisplay: (): string => "0701 228 8798",
  supportPhoneTel: (): string => "tel:+2347012288798",
  companyAddressLine: (): string =>
    "Debridgers Ltd · HIGH COST JUNCTION, Kaduna, Nigeria",
  whatsapp: (): string => "https://wa.me/2347012288798",
  linkedin: (): string => "https://www.linkedin.com/company/debridgers",
  /*
   * Order receipt "account manager" strip. Override with env when a named
   * manager is assigned; otherwise support is the honest fallback.
   */
  accountManagerName: (): string =>
    process.env.ACCOUNT_MANAGER_NAME || "Debridgers Support",
  accountManagerPhoneDisplay: (): string =>
    process.env.ACCOUNT_MANAGER_PHONE || "0701 228 8798",
  accountManagerPhoneTel: (): string =>
    process.env.ACCOUNT_MANAGER_PHONE_TEL || "tel:+2347012288798",
} as const;
