import { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  Shield,
  FolderKanban,
  Inbox,
  FileSignature,
} from "lucide-react";
import {
  useAuth,
  usePageLoader,
  AppLogo,
  SearchInputField,
} from "@debridgers/ui-web";
import { logout } from "@debridgers/api-client";

const HR_ROLES = new Set(["applicant", "employee", "admin"]);

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Home",
    items: [
      {
        href: "/hr-dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        roles: ["applicant", "employee", "admin"],
      },
    ],
  },
  {
    label: "Recruitment",
    items: [
      {
        href: "/hr-dashboard/recruitment",
        label: "Jobs & pipeline",
        icon: Briefcase,
        roles: ["admin"],
      },
      {
        href: "/hr-dashboard/applications",
        label: "My applications",
        icon: Inbox,
        roles: ["applicant", "employee"],
      },
      {
        href: "/hr-dashboard/offers",
        label: "Offers",
        icon: FileText,
        roles: ["applicant", "employee"],
      },
      {
        href: "/hr-dashboard/contracts",
        label: "Contracts",
        icon: FileSignature,
        roles: ["applicant", "employee"],
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/hr-dashboard/people",
        label: "Directory",
        icon: Users,
        roles: ["admin", "employee"],
      },
      {
        href: "/hr-dashboard/performance",
        label: "Performance",
        icon: ClipboardList,
        roles: ["admin", "employee"],
      },
      {
        href: "/hr-dashboard/reports",
        label: "Reports",
        icon: FolderKanban,
        roles: ["admin", "employee"],
      },
      {
        href: "/hr-dashboard/policies",
        label: "Policies",
        icon: Shield,
        roles: ["admin", "employee"],
      },
      {
        href: "/hr-dashboard/analytics",
        label: "Analytics",
        icon: BarChart3,
        roles: ["admin"],
      },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/hr-dashboard": "Overview",
  "/hr-dashboard/recruitment": "Recruitment",
  "/hr-dashboard/applications": "My applications",
  "/hr-dashboard/offers": "Offers",
  "/hr-dashboard/contracts": "Contracts",
  "/hr-dashboard/people": "People",
  "/hr-dashboard/performance": "Performance",
  "/hr-dashboard/reports": "Reports",
  "/hr-dashboard/policies": "Policies",
  "/hr-dashboard/analytics": "Analytics",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ");
}

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { withLoader } = usePageLoader();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (isLoading) return;
    if (!user || !HR_ROLES.has(user.role)) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, user, navigate]);

  const groups = useMemo(() => {
    if (!user) return [];
    return NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user.role)),
    })).filter((group) => group.items.length > 0);
  }, [user]);

  const pageTitle =
    TITLES[pathname] ??
    (pathname.startsWith("/hr-dashboard/recruitment/jobs/")
      ? "Job pipeline"
      : "Dashboard");

  async function handleLogout(): Promise<void> {
    await withLoader(logout);
    navigate("/login");
  }

  if (isLoading) return null;

  function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-xl bg-[#FCFDFD] p-4 pt-6">
          <div className="mx-auto flex h-16 items-center">
            <Link to="/hr-dashboard" onClick={onNavClick}>
              <AppLogo />
            </Link>
          </div>

          <nav className="flex flex-1 flex-col gap-4">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p className="font-open-sans text-heading text-base font-medium uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active =
                    item.href === "/hr-dashboard"
                      ? pathname === item.href
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                  const cls = active
                    ? "flex cursor-pointer items-center gap-3 rounded-2xl bg-primary p-3 font-open-sans text-base text-white transition-all duration-300 ease-in-out"
                    : "text-body flex cursor-pointer items-center gap-3 rounded-2xl p-3 font-open-sans text-base transition-all duration-300 ease-in-out hover:bg-primary hover:text-white";
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavClick}
                      className={cls}
                    >
                      <item.icon size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-3 rounded-xl bg-[#FAFAFB] px-4 py-2">
            <div className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white">
              {user ? getInitials(user.email) : "-"}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-heading truncate text-sm font-semibold">
                {user?.email ?? "…"}
              </span>
              <span className="text-body truncate text-xs capitalize">
                {user ? roleLabel(user.role) : ""}
              </span>
            </div>
          </div>
        </div>

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
          <aside className="sticky top-0 hidden h-screen w-70 shrink-0 rounded-2xl lg:flex lg:flex-col">
            <Sidebar />
          </aside>

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

          <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
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

              <Link
                to="/careers"
                className="font-open-sans text-primary text-sm font-semibold hover:underline"
              >
                Careers board
              </Link>
            </header>

            <main className="min-h-0 flex-1 px-4 pb-8 lg:px-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
