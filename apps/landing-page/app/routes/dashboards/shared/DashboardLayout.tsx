import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell, LogOut } from "lucide-react";
import { AppLogo, DashSearchInput, PrimaryButton } from "@debridgers/ui-web";
import { useDashboardNav } from "../../../hooks/useDashboardNav";
import { logout } from "../../../lib/auth";

const titleMaps: Record<string, Record<string, string>> = {
  "/agent-dashboard": {
    "/agent-dashboard": "Overview",
    "/agent-dashboard/request-stock": "Request Stock",
    "/agent-dashboard/daily-report": "Daily Report",
    "/agent-dashboard/leaderboard": "Leaderboard",
    "/agent-dashboard/wallet": "Weekly Payout",
    "/agent-dashboard/notification": "Notification",
    "/agent-dashboard/settings": "Settings",
  },
  "/buyer-dashboard": {
    "/buyer-dashboard": "Overview",
    "/buyer-dashboard/shop": "Shop / Catalog",
    "/buyer-dashboard/orders": "My Orders",
    "/buyer-dashboard/wallet": "Wallet & Payment",
    "/buyer-dashboard/notification": "Notification",
    "/buyer-dashboard/settings": "Profile & Address",
    "/buyer-dashboard/checkout": "Checkout",
  },
  "/admin-dashboard": {
    "/admin-dashboard": "Overview",
    "/admin-dashboard/agents": "Agents",
    "/admin-dashboard/buyers": "Buyers",
    "/admin-dashboard/settings": "Settings",
  },
};

const userInfo = {
  "/agent-dashboard": {
    initials: "AA",
    name: "Abdul-Malik",
    sub: "Kaduna South",
  },
  "/buyer-dashboard": {
    initials: "AA",
    name: "Abdul-Malik",
    sub: "Kaduna South",
  },
  "/admin-dashboard": { initials: "AD", name: "Admin", sub: "Debridgers HQ" },
};

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { groups, isActive, basePath, isAgent, isBuyer } = useDashboardNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const titleMap = titleMaps[basePath] ?? {};
  const pageTitle = titleMap[pathname] ?? "Dashboard";
  const user = userInfo[basePath as keyof typeof userInfo];

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
    return (
      <div className="flex h-full flex-col px-4">
        {/* Logo + Nav + User Card */}
        <div className="flex h-full flex-1 flex-col gap-6 py-6">
          {/* Logo */}
          <div className="mx-auto flex h-16 items-center">
            <Link to={basePath} onClick={onNavClick}>
              <AppLogo />
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-6 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p
                  className="font-open-sans text-base tracking-widest uppercase"
                  style={{ color: "var(--text-colour)" }}
                >
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const isExternal = item.href.startsWith("http");
                  const cls =
                    "flex items-center gap-3 font-open-sans rounded-[16px] p-4 text-lg transition-all duration-300 ease-in-out cursor-pointer";
                  const style = {
                    backgroundColor: active
                      ? "rgba(75,122,81,1)"
                      : "transparent",
                    color: active ? "#FCFDFD" : "var(--text-colour)",
                  };
                  const hover = {
                    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor =
                          "var(--primary-color)";
                        e.currentTarget.style.color = "#ffffff";
                      }
                    },
                    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-colour)";
                      }
                    },
                  };

                  if (isExternal) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavClick}
                        className={cls}
                        style={style}
                        {...hover}
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
                      style={style}
                      {...hover}
                    >
                      <item.icon size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User card + logout */}
          <div className="flex items-center gap-3 rounded-xl bg-[#FAFAFB] px-4 py-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              {user?.initials}
            </div>
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate text-sm font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                {user?.name}
              </span>
              <span
                className="truncate text-xs"
                style={{ color: "var(--text-colour)" }}
              >
                {user?.sub}
              </span>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="font-open-sans text-text flex w-full cursor-pointer items-center gap-3 rounded-[16px] p-4 text-base transition-all duration-300 ease-in-out"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#FEE2E2";
            e.currentTarget.style.color = "#DC2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-colour)";
          }}
        >
          <LogOut size={17} className="text-error-red" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <div className="layout-max-width relative flex min-h-screen flex-col">
        <div className="bg-dash-page-bg px-section-px flex min-h-screen w-full gap-6">
          {/* Desktop sidebar */}
          <aside className="border-gray hidden w-[280px] shrink-0 rounded-[16px] border bg-[#FCFDFD] lg:flex lg:flex-col">
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
                  className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.aside
                  key="drawer"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.28 }}
                  className="fixed top-0 left-0 z-50 h-full w-[280px] bg-[#FCFDFD] lg:hidden"
                >
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 cursor-pointer rounded-full p-1.5 hover:bg-black/10"
                    aria-label="Close menu"
                  >
                    <X size={20} style={{ color: "var(--text-colour)" }} />
                  </button>
                  <Sidebar onNavClick={() => setMobileOpen(false)} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Topbar */}
            <header
              className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 lg:px-6"
              style={{
                backgroundColor: "var(--dash-topbar-bg)",
                borderColor: "var(--border-gray)",
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  className="shrink-0 transition-colors lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu size={22} style={{ color: "var(--text-colour)" }} />
                </button>
                <h1
                  className="font-syne shrink-0 text-lg font-bold lg:text-xl"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {pageTitle}
                </h1>
              </div>

              <DashSearchInput
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="hidden w-full max-w-[500px] md:inline-flex"
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
                      + New Order
                    </PrimaryButton>
                  </Link>
                ) : null}

                <button
                  className="relative rounded-full p-2 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={20} style={{ color: "var(--icon-secondary)" }} />
                  <span
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--error-red)" }}
                  />
                </button>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
