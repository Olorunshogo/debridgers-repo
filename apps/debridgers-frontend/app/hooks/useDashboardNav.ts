import { useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Wallet,
  Bell,
  User,
  MessageCircle,
  HelpCircle,
  type LucideIcon,
  ClipboardPenLine,
  Trophy,
  Package,
  MapPin,
  Banknote,
  Mail,
  Truck,
} from "lucide-react";
import { supportWhatsAppHref } from "@debridgers/ui-web";

export type AdminTier = "super" | "sub";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /*
   * Which admin tiers may see this item. Omitted means every tier.
   *
   * There is one admin dashboard, not two: a sub-admin gets a narrower nav
   * rather than a separate set of routes. Splitting them produced two copies of
   * overview, buyers and settings that had to be kept in step by hand.
   */
  tiers?: readonly AdminTier[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const buyerNavGroups: NavGroup[] = [
  {
    label: "MAIN",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/buyer-dashboard" },
      {
        label: "Shop / Catalog",
        icon: ShoppingCart,
        href: "/buyer-dashboard/shop",
      },
      {
        label: "My Orders",
        icon: ClipboardList,
        href: "/buyer-dashboard/orders",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        label: "Wallet & Payment",
        icon: Wallet,
        href: "/buyer-dashboard/wallet",
      },
      {
        label: "Notifications",
        icon: Bell,
        href: "/buyer-dashboard/notifications",
      },
      {
        label: "Profile & Address",
        icon: User,
        href: "/buyer-dashboard/settings",
      },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      {
        label: "WhatsApp Support",
        icon: MessageCircle,
        href: supportWhatsAppHref(),
      },
      { label: "Help Center", icon: HelpCircle, href: "/buyer-dashboard/help" },
    ],
  },
];

const agentNavGroups: NavGroup[] = [
  {
    label: "MAIN",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/agent-dashboard" },
      {
        label: "Request Stock",
        icon: ShoppingCart,
        href: "/agent-dashboard/request-stock",
      },
      {
        label: "Daily Report",
        icon: ClipboardPenLine,
        href: "/agent-dashboard/daily-report",
      },
      {
        label: "Leader board",
        icon: Trophy,
        href: "/agent-dashboard/leaderboard",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        label: "Wallet & Payment",
        icon: Wallet,
        href: "/agent-dashboard/wallet",
      },
      {
        label: "Notification",
        icon: Bell,
        href: "/agent-dashboard/notifications",
      },
      {
        label: "Profile & Address",
        icon: User,
        href: "/agent-dashboard/settings",
      },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      {
        label: "WhatsApp Support",
        icon: MessageCircle,
        href: supportWhatsAppHref(),
      },
      { label: "Help Center", icon: HelpCircle, href: "/agent-dashboard/help" },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    label: "MAIN",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/admin-dashboard" },
      {
        label: "Agents",
        icon: User,
        href: "/admin-dashboard/agents",
        tiers: ["super"],
      },
      { label: "Buyers", icon: ShoppingCart, href: "/admin-dashboard/buyers" },
      { label: "Deliveries", icon: Truck, href: "/admin-dashboard/deliveries" },
      {
        label: "Products",
        icon: Package,
        href: "/admin-dashboard/products",
        tiers: ["super"],
      },
      {
        label: "Outreach",
        icon: MapPin,
        href: "/admin-dashboard/outreach",
        tiers: ["super"],
      },
      {
        label: "Payouts",
        icon: Banknote,
        href: "/admin-dashboard/payouts",
        tiers: ["super"],
      },
      {
        label: "Admin Invites",
        icon: Mail,
        href: "/admin-dashboard/admin-invites",
        tiers: ["super"],
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        label: "Notifications",
        icon: Bell,
        href: "/admin-dashboard/notifications",
      },
      { label: "Settings", icon: User, href: "/admin-dashboard/settings" },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      {
        label: "WhatsApp Support",
        icon: MessageCircle,
        href: supportWhatsAppHref(),
      },
    ],
  },
];

const buyerAdminNavGroups: NavGroup[] = [
  {
    label: "MAIN",
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        href: "/buyer-admin-dashboard",
      },
      {
        label: "Buyers",
        icon: ShoppingCart,
        href: "/buyer-admin-dashboard/buyers",
      },
      {
        label: "Deliveries",
        icon: Truck,
        href: "/buyer-admin-dashboard/deliveries",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        label: "Settings",
        icon: User,
        href: "/buyer-admin-dashboard/settings",
      },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      {
        label: "WhatsApp Support",
        icon: MessageCircle,
        href: supportWhatsAppHref(),
      },
    ],
  },
];

/* Drops what this tier may not see, and any group left empty by that. */
function navForTier(groups: NavGroup[], tier: AdminTier): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.tiers || item.tiers.includes(tier),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function useDashboardNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isBuyer = pathname.startsWith("/buyer-dashboard");
  const isAgent = pathname.startsWith("/agent-dashboard");
  const isAdmin = pathname.startsWith("/admin-dashboard");
  const isBuyerAdmin = pathname.startsWith("/buyer-admin-dashboard");

  /*
   * Tier comes from the session, not the URL.
   *
   * Nav used to be chosen purely by path, so what an admin saw depended on
   * where they happened to be rather than on what they are allowed to do.
   * Defaults to the narrower tier: showing a sub-admin links they cannot use is
   * worse than hiding one from a super admin until the token loads.
   */
  const tier: AdminTier = user?.admin_tier === "super" ? "super" : "sub";

  const groups = isAdmin
    ? navForTier(adminNavGroups, tier)
    : isAgent
      ? agentNavGroups
      : isBuyerAdmin
        ? buyerAdminNavGroups
        : buyerNavGroups;

  const basePath = isAdmin
    ? "/admin-dashboard"
    : isAgent
      ? "/agent-dashboard"
      : isBuyerAdmin
        ? "/buyer-admin-dashboard"
        : "/buyer-dashboard";

  const allItems = groups.flatMap((g) => g.items);

  const activeHref =
    allItems.reduce<string | null>((best, item) => {
      if (!pathname.startsWith(item.href)) return best;
      if (best === null || item.href.length > best.length) return item.href;
      return best;
    }, null) ?? basePath;

  const isActive = (href: string) => href === activeHref;

  return {
    groups,
    allItems,
    isActive,
    basePath,
    isBuyer,
    isAgent,
    isAdmin,
    isBuyerAdmin,
  };
}
