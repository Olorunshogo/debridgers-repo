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
  Calculator,
  Mail,
  Truck,
  Users,
  PhoneCall,
} from "lucide-react";
import { supportWhatsAppHref } from "../data/support";

export type AdminTier = "super" | "sub";

/**
 * Which part of the business an admin looks after.
 *
 * Distinct from `AdminTier`, and deliberately so. A tier is a privilege level
 * and is an auth credential: `admin_tier` is checked by admin-key.guard against
 * the SUPER_ADMIN_KEY env values, so it must stay small and boring. A domain is
 * an area of responsibility, several can apply to one person, and they carry no
 * ordering.
 *
 * Today this only records which domain owns a nav item; `tiers` still does the
 * gating. When `users` grows a domains column, gating moves here and the
 * mapping is already written down.
 */
export type AdminDomain =
  | "buyer"
  | "agent"
  | "supply"
  | "finance"
  | "catalogue"
  | "fulfilment"
  | "support"
  | "growth";

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
  /*
   * The domain that owns this surface, where one does. Metadata only for now:
   * nothing reads it to decide visibility yet. Items with no domain are the
   * shared admin surface.
   */
  domain?: AdminDomain;
  /* Marks a surface that is routed and readable but not yet built. */
  badge?: string;
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
        domain: "agent",
      },
      { label: "Buyers", icon: ShoppingCart, href: "/admin-dashboard/buyers" },
      { label: "Deliveries", icon: Truck, href: "/admin-dashboard/deliveries" },
      {
        label: "Products",
        icon: Package,
        href: "/admin-dashboard/products",
        tiers: ["super"],
        domain: "catalogue",
      },
      {
        label: "Outreach",
        icon: MapPin,
        href: "/admin-dashboard/outreach",
        tiers: ["super"],
        domain: "growth",
      },
      {
        label: "Payouts",
        icon: Banknote,
        href: "/admin-dashboard/payouts",
        tiers: ["super"],
        domain: "finance",
      },
      {
        label: "Pricing & Delivery",
        icon: Wallet,
        href: "/admin-dashboard/pricing",
        tiers: ["super"],
        domain: "catalogue",
      },
      {
        label: "Admin Invites",
        icon: Mail,
        href: "/admin-dashboard/admin-invites",
        tiers: ["super"],
      },
      {
        label: "Procurement Targets",
        icon: Calculator,
        href: "/admin-dashboard/procurement-targets",
        tiers: ["super"],
        domain: "supply",
      },
      /*
       * The buyer domain. Visible to a sub-admin because it is their desk, and
       * to a super admin because a super admin sees everything.
       *
       * `domain` records ownership and gates nothing yet; `tiers` still decides
       * visibility. When users grows a domains column, this is where the switch
       * happens.
       */
      {
        label: "Buyer Desk",
        icon: ClipboardList,
        href: "/admin-dashboard/buyer",
        domain: "buyer",
      },
      {
        label: "Order Tracking",
        icon: Truck,
        href: "/admin-dashboard/buyer/deliveries",
        domain: "buyer",
      },
      {
        label: "Assisted Checkout",
        icon: PhoneCall,
        href: "/admin-dashboard/assisted-checkout",
        tiers: ["super"],
        badge: "Soon",
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

/*
 * Tier is supplied by the caller rather than read from an auth context: this
 * hook ships in a package and must not reach into the consuming app's session.
 */
export function useDashboardNav(adminTier?: AdminTier | null) {
  const { pathname } = useLocation();

  const isBuyer = pathname.startsWith("/buyer-dashboard");
  const isAgent = pathname.startsWith("/agent-dashboard");
  const isAdmin = pathname.startsWith("/admin-dashboard");
  /*
   * A sub-admin is identified by their tier, not by where they are standing.
   * This used to be a path check against /buyer-admin-dashboard, which no
   * longer exists: that surface is now a domain inside the one admin dashboard,
   * so a super admin visiting it is still a super admin.
   */

  /*
   * Tier comes from the session, not the URL.
   *
   * Nav used to be chosen purely by path, so what an admin saw depended on
   * where they happened to be rather than on what they are allowed to do.
   * Defaults to the narrower tier: showing a sub-admin links they cannot use is
   * worse than hiding one from a super admin until the token loads.
   */
  const tier: AdminTier = adminTier === "super" ? "super" : "sub";

  const isSubAdmin: boolean = isAdmin && tier === "sub";

  const groups = isAdmin
    ? navForTier(adminNavGroups, tier)
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

  return {
    groups,
    allItems,
    isActive,
    basePath,
    isBuyer,
    isAgent,
    isAdmin,
    isSubAdmin,
  };
}
