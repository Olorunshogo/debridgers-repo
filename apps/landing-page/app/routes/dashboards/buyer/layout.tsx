import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell, Plus } from "lucide-react";
import { AppLogo, DashSearchInput } from "@debridgers/ui-web";
import { useDashboardNav } from "../../../hooks/useDashboardNav";

// ── Page title map ────────────────────────────────────────────────────────────
const titleMap: Record<string, string> = {
  "/buyer-dashboard": "Overview",
  "/buyer-dashboard/shop": "Shop / Catalog",
  "/buyer-dashboard/orders": "My Orders",
  "/buyer-dashboard/wallet": "Wallet & Payment",
  "/buyer-dashboard/notification": "Notification",
  "/buyer-dashboard/settings": "Profile & Address",
  "/buyer-dashboard/checkout": "Checkout",
};

// ── User card (bottom of sidebar) ────────────────────────────────────────────
function UserCard() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3"
      style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{
          backgroundColor: "var(--secondary-color)",
          color: "var(--heading-colour)",
        }}
      >
        AA
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-white">
          Abdul-Malik
        </span>
        <span className="truncate text-xs text-white/60">Kaduna South</span>
      </div>
    </div>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────
interface SidebarContentProps {
  onNavClick?: () => void;
}

function SidebarContent({ onNavClick }: SidebarContentProps) {
  const { groups, isActive } = useDashboardNav();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 items-center px-6">
        <Link to="/buyer-dashboard" onClick={onNavClick}>
          <span className="font-syne text-2xl font-bold text-white">
            Debridger
          </span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="mb-1 px-3 text-xs font-semibold tracking-widest text-white/40">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              const isExternal = item.href.startsWith("http");
              const Comp = isExternal ? "a" : Link;
              const linkProps = isExternal
                ? {
                    href: item.href,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  }
                : { to: item.href };

              return (
                <Comp
                  key={item.href}
                  {...(linkProps as Record<string, string>)}
                  onClick={onNavClick}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: active ? "#ffffff" : "transparent",
                    color: active
                      ? "var(--primary-color)"
                      : "rgba(255,255,255,0.75)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "rgba(255,255,255,0.1)";
                      (e.currentTarget as HTMLElement).style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color =
                        "rgba(255,255,255,0.75)";
                    }
                  }}
                >
                  <item.icon size={17} />
                  {item.label}
                </Comp>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="p-4">
        <UserCard />
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function BuyerDashboardLayout() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const pageTitle = titleMap[pathname] ?? "Dashboard";

  return (
    <div
      className="flex min-h-screen w-full"
      style={{ backgroundColor: "var(--dash-page-bg)" }}
    >
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden w-[280px] shrink-0 lg:flex lg:flex-col"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ── */}
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
              className="fixed top-0 left-0 z-50 h-full w-[280px] lg:hidden"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="flex h-16 shrink-0 items-center gap-4 border-b px-4 lg:px-6"
          style={{
            backgroundColor: "var(--dash-topbar-bg)",
            borderColor: "var(--border-gray)",
          }}
        >
          {/* Mobile hamburger */}
          <button
            className="text-icon-secondary hover:text-icon-primary shrink-0 transition-colors lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Page title */}
          <h1
            className="font-syne shrink-0 text-lg font-bold lg:text-xl"
            style={{ color: "var(--heading-colour)" }}
          >
            {pageTitle}
          </h1>

          {/* Search — grows to fill space */}
          <div className="mx-4 flex-1">
            <DashSearchInput
              placeholder="Search products, orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Notification bell */}
            <button
              className="hover:bg-bg-light relative rounded-full p-2 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} style={{ color: "var(--icon-secondary)" }} />
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--error-red)" }}
              />
            </button>

            {/* New Order */}
            <Link
              to="/buyer-dashboard/shop"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              <Plus size={15} />
              New Order
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
