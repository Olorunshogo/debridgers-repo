import { useLocation } from "react-router";
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

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
        href: "/agent-dashboard/notification",
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
      { label: "Agents", icon: User, href: "/admin-dashboard/agents" },
      { label: "Buyers", icon: ShoppingCart, href: "/admin-dashboard/buyers" },
      { label: "Products", icon: Package, href: "/admin-dashboard/products" },
      { label: "Outreach", icon: MapPin, href: "/admin-dashboard/outreach" },
      { label: "Payouts", icon: Banknote, href: "/admin-dashboard/payouts" },
      {
        label: "Admin Invites",
        icon: Mail,
        href: "/admin-dashboard/admin-invites",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
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

export function useDashboardNav() {
  const { pathname } = useLocation();

  const isBuyer = pathname.startsWith("/buyer-dashboard");
  const isAgent = pathname.startsWith("/agent-dashboard");
  const isAdmin = pathname.startsWith("/admin-dashboard");
  const isBuyerAdmin = pathname.startsWith("/buyer-admin-dashboard");

  const groups = isAdmin
    ? adminNavGroups
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
