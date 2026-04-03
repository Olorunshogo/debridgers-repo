import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell } from "lucide-react";
import { AppLogo, DashSearchInput } from "@debridgers/ui-web";
import { useDashboardNav } from "../../../hooks/useDashboardNav";

const titleMap: Record<string, string> = {
  "/admin-dashboard": "Overview",
  "/admin-dashboard/agents": "Agents",
  "/admin-dashboard/buyers": "Buyers",
  "/admin-dashboard/settings": "Settings",
};

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
        AD
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-white">Admin</span>
        <span className="truncate text-xs text-white/60">Debridger HQ</span>
      </div>
    </div>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { groups, isActive } = useDashboardNav();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center px-6">
        <Link to="/admin-dashboard" onClick={onNavClick}>
          <span className="font-syne text-2xl font-bold text-white">
            Debridger
          </span>
        </Link>
      </div>
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
      <div className="p-4">
        <UserCard />
      </div>
    </div>
  );
}

export default function AdminDashboardLayout() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pageTitle = titleMap[pathname] ?? "Admin";

  return (
    <div
      className="flex min-h-screen w-full"
      style={{ backgroundColor: "var(--dash-page-bg)" }}
    >
      <aside
        className="hidden w-[280px] shrink-0 lg:flex lg:flex-col"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <SidebarContent />
      </aside>

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
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-16 shrink-0 items-center gap-4 border-b px-4 lg:px-6"
          style={{
            backgroundColor: "var(--dash-topbar-bg)",
            borderColor: "var(--border-gray)",
          }}
        >
          <button
            className="text-icon-secondary hover:text-icon-primary shrink-0 transition-colors lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h1
            className="font-syne shrink-0 text-lg font-bold lg:text-xl"
            style={{ color: "var(--heading-colour)" }}
          >
            {pageTitle}
          </h1>
          <div className="mx-4 flex-1">
            <DashSearchInput
              placeholder="Search agents, buyers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <button className="hover:bg-bg-light relative rounded-full p-2 transition-colors">
            <Bell size={20} style={{ color: "var(--icon-secondary)" }} />
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--error-red)" }}
            />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
