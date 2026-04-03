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
} from "lucide-react";

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
        label: "Notification",
        icon: Bell,
        href: "/buyer-dashboard/notification",
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
        href: "https://wa.me/+2348167042797",
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
        label: "Sales Reports",
        icon: ClipboardList,
        href: "/agent-dashboard/reports",
      },
      {
        label: "Commissions",
        icon: Wallet,
        href: "/agent-dashboard/commissions",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        label: "Notification",
        icon: Bell,
        href: "/agent-dashboard/notification",
      },
      {
        label: "Profile & Settings",
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
        href: "https://wa.me/+2348167042797",
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
        href: "https://wa.me/+2348167042797",
      },
    ],
  },
];

export function useDashboardNav() {
  const { pathname } = useLocation();

  const isBuyer = pathname.startsWith("/buyer-dashboard");
  const isAgent = pathname.startsWith("/agent-dashboard");
  const isAdmin = pathname.startsWith("/admin-dashboard");

  const groups = isAdmin
    ? adminNavGroups
    : isAgent
      ? agentNavGroups
      : buyerNavGroups;

  const basePath = isAdmin
    ? "/admin-dashboard"
    : isAgent
      ? "/agent-dashboard"
      : "/buyer-dashboard";

  const allItems = groups.flatMap((g) => g.items);

  const activeHref =
    allItems.reduce<string | null>((best, item) => {
      if (!pathname.startsWith(item.href)) return best;
      if (best === null || item.href.length > best.length) return item.href;
      return best;
    }, null) ?? basePath;

  const isActive = (href: string) => href === activeHref;

  return { groups, allItems, isActive, basePath, isBuyer, isAgent, isAdmin };
}
