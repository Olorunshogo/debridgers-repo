import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // === Landing Page Routes
  layout("routes/landing/layout.tsx", [
    index("routes/landing/home.tsx"),
    route("shop", "routes/landing/shop.tsx"),
    route("outreach", "routes/landing/outreach.tsx"),
    route("contact", "routes/landing/contact.tsx"),
    route("agents", "routes/landing/agents.tsx"),
  ]),

  // === Auth Routes
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("signup", "routes/auth/signup.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
    route("verify-email", "routes/auth/verify-email.tsx"),
    /*
     * Deliberately prefixed, unlike its siblings above. Admins get their own
     * URL so the entry point is not advertised on the public login page.
     */
    route("auth/admin/login", "routes/auth/admin-login.tsx"),
    route("auth/admin/register", "routes/auth/admin-register.tsx"),
  ]),

  // === Buyer Dashboard
  layout("routes/dashboards/buyer/layout.tsx", [
    route("buyer-dashboard", "routes/dashboards/buyer/overview.tsx"),
    route("buyer-dashboard/orders", "routes/dashboards/buyer/orders.tsx"),
    route("buyer-dashboard/shop", "routes/dashboards/buyer/shop.tsx"),
    route("buyer-dashboard/wallet", "routes/dashboards/buyer/wallet.tsx"),
    route("buyer-dashboard/checkout", "routes/dashboards/buyer/checkout.tsx"),
    route(
      "buyer-dashboard/notifications",
      "routes/dashboards/buyer/notifications.tsx",
    ),
    route("buyer-dashboard/settings", "routes/dashboards/buyer/settings.tsx"),
    route("buyer-dashboard/help", "routes/dashboards/buyer/help.tsx"),
  ]),

  // === Agent Dashboard
  layout("routes/dashboards/agent/layout.tsx", [
    route("agent-dashboard", "routes/dashboards/agent/overview.tsx"),
    route(
      "agent-dashboard/request-stock",
      "routes/dashboards/agent/request-stock.tsx",
    ),
    route(
      "agent-dashboard/daily-report",
      "routes/dashboards/agent/daily-report.tsx",
    ),
    route(
      "agent-dashboard/leaderboard",
      "routes/dashboards/agent/leaderboard.tsx",
    ),
    route("agent-dashboard/wallet", "routes/dashboards/agent/wallet.tsx"),
    route(
      "agent-dashboard/notification",
      "routes/dashboards/agent/notification.tsx",
    ),
    route("agent-dashboard/settings", "routes/dashboards/agent/settings.tsx"),
    route("agent-dashboard/help", "routes/dashboards/agent/help.tsx"),
  ]),

  // === Admin Dashboard
  layout("routes/dashboards/admin/layout.tsx", [
    route("admin-dashboard", "routes/dashboards/admin/overview.tsx"),
    route("admin-dashboard/agents", "routes/dashboards/admin/agents.tsx"),
    route("admin-dashboard/buyers", "routes/dashboards/admin/buyers.tsx"),
    route(
      "admin-dashboard/admin-invites",
      "routes/dashboards/admin/admin.invites.tsx",
    ),
    route("admin-dashboard/settings", "routes/dashboards/admin/settings.tsx"),
    route("admin-dashboard/products", "routes/dashboards/admin/products.tsx"),
    route("admin-dashboard/outreach", "routes/dashboards/admin/outreach.tsx"),
    route("admin-dashboard/payouts", "routes/dashboards/admin/payouts.tsx"),
    /* These pages existed on disk but were never routed, so the sub-admin work
       they belong to was unreachable. */
    route(
      "admin-dashboard/deliveries",
      "routes/dashboards/admin/deliveries.tsx",
    ),
    route(
      "admin-dashboard/deliveries/:orderId/verify",
      "routes/dashboards/admin/deliveries.orderId.verify.tsx",
    ),
    route(
      "admin-dashboard/buyer-management",
      "routes/dashboards/admin/buyer-management.tsx",
    ),
  ]),
  // === Buyer Admin Dashboard
  layout("routes/dashboards/buyer-admin/layout.tsx", [
    route(
      "buyer-admin-dashboard",
      "routes/dashboards/buyer-admin/overview.tsx",
    ),
    route(
      "buyer-admin-dashboard/buyers",
      "routes/dashboards/buyer-admin/buyers.tsx",
    ),
    route(
      "buyer-admin-dashboard/deliveries",
      "routes/dashboards/buyer-admin/deliveries.tsx",
    ),
    route(
      "buyer-admin-dashboard/settings",
      "routes/dashboards/buyer-admin/settings.tsx",
    ),
  ]),
] satisfies RouteConfig;
