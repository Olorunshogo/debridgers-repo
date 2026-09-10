/*
 * Every frontend URL an email can link to, in one place.
 *
 * These used to be template literals scattered across email.service.ts, which
 * is how `${APP_URL}/agent/login` survived: there is no such route, so that
 * button has been a 404 in two live agent emails. A typo in a string spread
 * over 700 lines is invisible; a typo here is a compile error.
 *
 * Auth links (verify, reset, login) must land on the app that owns the role.
 * A single APP_URL cannot cover marketing + buyer + agent + admin + HR, so
 * role-specific *_APP_URL envs win when set; APP_URL is the fallback.
 */

type LinkRole =
  | "admin"
  | "agent"
  | "buyer"
  | "company"
  | "hr"
  | "hiring_manager"
  | "applicant"
  | "employee"
  | string;

function trimBase(url: string): string {
  return url.replace(/\/$/, "");
}

function defaultAppUrl(): string {
  return trimBase(process.env.APP_URL || "http://localhost:5173");
}

function appUrlForRole(role?: LinkRole): string {
  const envByRole: Record<string, string | undefined> = {
    buyer: process.env.BUYER_APP_URL,
    company: process.env.BUYER_APP_URL,
    agent: process.env.AGENT_APP_URL,
    admin: process.env.ADMIN_APP_URL,
    hr: process.env.HR_APP_URL,
    hiring_manager: process.env.HR_APP_URL,
    applicant: process.env.HR_APP_URL,
    employee: process.env.HR_APP_URL,
  };
  const specific = role ? envByRole[role] : undefined;
  if (specific) return trimBase(specific);
  return defaultAppUrl();
}

/*
 * Emails are opened on the recipient's device, not ours. A logo URL that still
 * points at localhost (or that was frozen before ConfigModule loaded .env)
 * shows as a broken image in Gmail. Prefer a dedicated asset host, then APP_URL,
 * then the public marketing site which already serves /logos/*.
 */
function emailAssetUrl(): string {
  return trimBase(
    process.env.EMAIL_ASSET_URL ||
      process.env.APP_URL ||
      "https://debridgers.com",
  );
}

function link(path: string, role?: LinkRole): string {
  return `${appUrlForRole(role)}${path}`;
}

export const emailLinks = {
  // === Auth
  login: (role?: LinkRole): string => link("/login", role),
  adminLogin: (): string => link("/login", "admin"),
  verifyEmail: (email: string, otp: string, role?: LinkRole): string =>
    link(
      `/verify-email?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
      role,
    ),
  resetPassword: (token: string, role?: LinkRole): string =>
    link(`/reset-password?token=${encodeURIComponent(token)}`, role),

  // === Dashboards
  adminDashboard: (): string => link("/admin-dashboard", "admin"),
  agentDashboard: (): string => link("/agent-dashboard", "agent"),
  buyerWallet: (): string => link("/buyer-dashboard/wallet", "buyer"),
  buyerOrders: (): string => link("/buyer-dashboard/orders", "buyer"),
  buyerOrder: (reference: string): string =>
    link(
      `/buyer-dashboard/orders?ref=${encodeURIComponent(reference)}`,
      "buyer",
    ),

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
