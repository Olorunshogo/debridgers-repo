import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell, LogOut } from "lucide-react";
import {
  useDialog,
  useAuth,
  AppLogo,
  SearchInputField,
  PrimaryButton,
  ActionRequiredChip,
  NotificationComponent,
  useDashboardNav,
  type NotificationRole,
} from "@debridgers/ui-web";
import {
  logout,
  getAccessToken,
  apiFetch,
  decodeJwtPayload,
} from "@debridgers/api-client";

const titleMaps: Record<string, Record<string, string>> = {
  "/agent-dashboard": {
    "/agent-dashboard": "Overview",
    "/agent-dashboard/request-stock": "Request Stock",
    "/agent-dashboard/daily-report": "Daily Report",
    "/agent-dashboard/leaderboard": "Leaderboard",
    "/agent-dashboard/wallet": "Weekly Payout",
    "/agent-dashboard/notifications": "Notifications",
    "/agent-dashboard/settings": "Settings",
    "/agent-dashboard/help": "Help Center",
  },
  "/buyer-dashboard": {
    "/buyer-dashboard": "Overview",
    "/buyer-dashboard/shop": "Shop / Catalog",
    "/buyer-dashboard/orders": "My Orders",
    "/buyer-dashboard/wallet": "Wallet & Payment",
    "/buyer-dashboard/notifications": "Notifications",
    "/buyer-dashboard/settings": "Profile & Address",
    "/buyer-dashboard/checkout": "Checkout",
    "/buyer-dashboard/help": "Help Center",
  },
  "/admin-dashboard": {
    "/admin-dashboard": "Overview",
    "/admin-dashboard/agents": "Agents",
    "/admin-dashboard/kyc": "KYC Review",
    "/admin-dashboard/buyers": "Buyers",
    "/admin-dashboard/products": "Products",
    "/admin-dashboard/outreach": "Outreach Records",
    "/admin-dashboard/payouts": "Payouts",
    "/admin-dashboard/assisted-checkout": "Assisted Checkout",
    "/admin-dashboard/admin-invites": "Admin Invites",
    "/admin-dashboard/deliveries": "Deliveries",
    "/admin-dashboard/pricing": "Pricing & Delivery",
    "/admin-dashboard/procurement-targets": "Procurement Targets",
    "/admin-dashboard/notifications": "Notifications",
    "/admin-dashboard/settings": "Settings",
    /* The buyer-admin domain, inside the one admin dashboard. */
    "/admin-dashboard/buyer": "Buyer Desk",
    "/admin-dashboard/buyer/deliveries": "Order Tracking",
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

/* Long enough that the admin has landed and looked around before being asked. */
const PASSWORD_PROMPT_DELAY_MS = 120_000;

/*
 * The one dashboard shell, shared by every role. It stays in the app rather
 * than the package: it is the single component that legitimately owns session
 * state, and pushing it into the package would mean threading auth through
 * every role layout to keep the package free of app context.
 */
export default function DashboardLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { groups, isActive, basePath, isAgent, isBuyer, isAdmin, isSubAdmin } =
    useDashboardNav(user?.admin_tier ?? null);
  /*
   * The flags above come from useDashboardNav, which reads them off the URL -
   * they say which dashboard is being viewed, not who is viewing it. The real
   * role lives here.
   */
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  /* Mirrors users.must_change_password. The server owns it; this is a cache. */
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    sub: string;
    avatar_url?: string | null;
  } | null>(null);
  /* Asked once per mount. The dialog is dismissable, so without this an admin
     who closed it would be re-prompted on every re-render. */
  const promptedForPasswordRef = useRef<boolean>(false);
  const { triggerDialog } = useDialog();

  /*
   * Route guard: this app only ever serves the agent role, so there is no
   * cross-role dashboard to switch to - a mismatch just means "not signed in
   * here", and the only place to send that is this app's own login.
   */
  useEffect(() => {
    if (isLoading) return;

    if (!user || user.role !== "agent") {
      navigate("/login", { replace: true });
    }
  }, [isLoading, user, navigate]);

  const openPasswordDialog = useCallback((): void => {
    triggerDialog("CHANGE_PASSWORD", {
      title: "Secure your account",
      description:
        "You are still on the temporary password you were invited with. Set a permanent one to keep the account yours.",
      /* The server clears must_change_password in the same write as the
         password, so the reminder retires on success and nowhere else. */
      onChanged: () => setMustChangePassword(false),
    });
  }, [triggerDialog]);

  /*
   * Open the prompt once, then leave the chip to do the reminding.
   *
   * The obligation itself lives on the server as users.must_change_password;
   * this only decides when to volunteer the dialog. Closing it stores nothing,
   * so the chip is still there afterwards and the prompt returns on the next
   * load - until the password actually changes.
   */
  useEffect(() => {
    if (!mustChangePassword) return;
    if (promptedForPasswordRef.current) return;

    const timer = window.setTimeout(() => {
      promptedForPasswordRef.current = true;
      openPasswordDialog();
    }, PASSWORD_PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [mustChangePassword, openPasswordDialog]);

  useEffect(() => {
    if (isAdmin) {
      const token = getAccessToken();
      const payload = token ? decodeJwtPayload<{ email: string }>(token) : null;
      const name = isSubAdmin ? "Buyer Admin" : "Debridgers Admin";
      setUserProfile({ name, sub: payload?.email ?? "" });

      /*
       * The JWT carries the email but not the password flag, and it would be
       * stale anyway: a token minted before the change would keep claiming the
       * password is temporary. Only the row is authoritative.
       */
      apiFetch<{ email?: string; must_change_password?: boolean }>("/admin/me")
        .then((p) => {
          setMustChangePassword(Boolean(p.must_change_password));
          if (p.email) setUserProfile({ name, sub: p.email });
        })
        .catch(() => {
          /* A failed profile read must not invent an obligation. */
        });
      return;
    }
    const endpoint = isAgent ? "/agent/me" : isBuyer ? "/buyer/me" : null;
    if (!endpoint) return;
    apiFetch<{
      first_name: string;
      last_name: string;
      lga?: string | null;
      email?: string;
      avatar_url?: string | null;
    }>(endpoint)
      .then((p) => {
        const name = `${p.first_name} ${p.last_name}`.trim();
        const sub = isAgent ? (p.lga ?? "") : (p.email ?? "");
        setUserProfile({ name, sub, avatar_url: p.avatar_url });
      })
      .catch(() => {});
  }, [isAgent, isBuyer, isAdmin, isSubAdmin]);

  /*
   * Every dashboard now uses the plural path, so this is no longer a per-role
   * ternary. Agent was the lone exception until its notifications moved onto
   * the shared service.
   */
  const notifPath = `${basePath}/notifications`;

  /*
   * Which role's notifications to load. Buyer-admin has no notification feed
   * of its own, so it keeps the plain link.
   */
  const dropdownRole: NotificationRole | null = isAdmin
    ? "admin"
    : isBuyer
      ? "buyer"
      : isAgent
        ? "agent"
        : null;

  useEffect(() => {
    const stored = localStorage.getItem("debridgers_has_unread");
    // First visit ever: default to showing the dot (assume unread notifications exist)
    if (stored === null) {
      localStorage.setItem("debridgers_has_unread", "true");
      setHasUnread(true);
    } else {
      setHasUnread(stored === "true");
    }
  }, [pathname]);

  // Clear the dot when navigating to the notification page
  useEffect(() => {
    if (pathname === notifPath) {
      localStorage.setItem("debridgers_has_unread", "false");
      setHasUnread(false);
    }
  }, [pathname, notifPath]);

  const titleMap = titleMaps[basePath] ?? {};
  const pageTitle = titleMap[pathname] ?? "Dashboard";

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login");
  }

  function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
    return (
      <div className="flex h-full flex-col">
        {/* Scrollable area: logo + nav + user card */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-xl bg-[#FCFDFD] p-4 pt-6">
          {/* Logo */}
          <div className="mx-auto flex h-16 items-center">
            <Link to={basePath} onClick={onNavClick}>
              <AppLogo />
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-4">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p className="font-open-sans text-heading text-base font-medium uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const isExternal = item.href.startsWith("http");
                  const cls = active
                    ? "flex cursor-pointer items-center gap-3 rounded-2xl bg-primary p-3 font-open-sans text-base text-white transition-all duration-300 ease-in-out"
                    : "text-body flex cursor-pointer items-center gap-3 rounded-2xl p-3 font-open-sans text-base transition-all duration-300 ease-in-out hover:bg-primary hover:text-white";

                  if (isExternal) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavClick}
                        className={cls}
                      >
                        <item.icon size={17} />
                        {item.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavClick}
                      className={cls}
                    >
                      <item.icon size={17} />
                      {item.label}
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User card */}
          <div className="flex items-center gap-3 rounded-xl bg-[#FAFAFB] px-4 py-2">
            <div className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.name}
                  className="h-full w-full object-cover"
                />
              ) : userProfile ? (
                getInitials(userProfile.name)
              ) : (
                "-"
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-heading truncate text-sm font-semibold">
                {userProfile?.name ?? "…"}
              </span>
              <span className="text-body truncate text-xs">
                {userProfile?.sub ?? ""}
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="font-open-sans text-body z-10 flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-2xl p-4 text-base transition-all duration-300 ease-in-out hover:bg-red-100 hover:text-red-600"
        >
          <LogOut size={18} className="text-error-red" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black">
      <div className="layout-max-width relative flex h-screen flex-col">
        <div className="bg-dash-page-bg px-section-px flex h-screen w-full gap-6">
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-screen w-70 shrink-0 rounded-2xl lg:flex lg:flex-col">
            <Sidebar />
          </aside>

          {/* Mobile drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 cursor-pointer bg-black/50 lg:hidden"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.aside
                  key="drawer"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.28 }}
                  className="fixed top-0 left-0 z-50 h-full w-full max-w-120 bg-[#FCFDFD] lg:hidden"
                >
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 cursor-pointer rounded-full p-1.5 hover:bg-black/10"
                    aria-label="Close menu"
                  >
                    <X size={20} className="text-body" />
                  </button>
                  <Sidebar onNavClick={() => setMobileOpen(false)} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main area */}
          <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
            {/* Topbar */}
            <header className="border-line bg-dash-topbar-bg mb-6 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 lg:px-6">
              <div className="flex items-center gap-3">
                <button
                  className="text-body shrink-0 cursor-pointer transition-colors lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu size={22} />
                </button>
                <h1 className="font-syne text-heading hidden shrink-0 text-lg font-bold sm:block lg:text-xl">
                  {pageTitle}
                </h1>
              </div>

              <SearchInputField
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="hidden w-full max-w-125 md:inline-flex"
              />

              <div className="flex shrink-0 items-center gap-3">
                {/* Topbar CTA */}
                {isAgent ? (
                  <Link to="/agent-dashboard/request-stock">
                    <PrimaryButton className="rounded-full px-4 py-2 text-sm">
                      + Request order
                    </PrimaryButton>
                  </Link>
                ) : isBuyer ? (
                  <Link to="/buyer-dashboard/shop">
                    <PrimaryButton className="rounded-full px-4 py-2 text-sm">
                      New Order
                    </PrimaryButton>
                  </Link>
                ) : null}

                {mustChangePassword && (
                  <ActionRequiredChip
                    label="Set your password"
                    title="You are still using the temporary password from your invite. Click to set a permanent one."
                    onClick={openPasswordDialog}
                  />
                )}

                {dropdownRole ? (
                  <NotificationComponent role={dropdownRole} />
                ) : (
                  <Link
                    to={notifPath}
                    className="relative rounded-full p-2 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={20} className="text-icon-secondary" />
                    {hasUnread && (
                      <span className="bg-error-red absolute top-1.5 right-1.5 h-2 w-2 rounded-full" />
                    )}
                  </Link>
                )}
              </div>
            </header>

            {/* Page content */}
            <main className="min-h-0 flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
