import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // === Marketing Page Routes
  layout("routes/marketing/layout.tsx", [
    index("routes/marketing/home.tsx"),
    route("about", "routes/marketing/about.tsx"),
    route("shop", "routes/marketing/shop.tsx"),
    route("outreach", "routes/marketing/outreach.tsx"),
    route("contact", "routes/marketing/contact.tsx"),
    route("agents", "routes/marketing/agents.tsx"),
    /*
     * One route for every legal document, resolved from a registry by slug.
     * Terms, the agent agreement and the privacy policy are the same renderer
     * over different data, so publishing another one is a content file and a
     * registry entry rather than a route and a page.
     */
    route("legal/:slug", "routes/marketing/legal.$slug.tsx"),
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
      "agent-dashboard/notifications",
      "routes/dashboards/agent/notifications.tsx",
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
    route(
      "admin-dashboard/notifications",
      "routes/dashboards/admin/notifications.tsx",
    ),
    route("admin-dashboard/settings", "routes/dashboards/admin/settings.tsx"),
    route("admin-dashboard/products", "routes/dashboards/admin/products.tsx"),
    route("admin-dashboard/outreach", "routes/dashboards/admin/outreach.tsx"),
    route("admin-dashboard/payouts", "routes/dashboards/admin/payouts.tsx"),
    route("admin-dashboard/pricing", "routes/dashboards/admin/pricing.tsx"),
    route(
      "admin-dashboard/assisted-checkout",
      "routes/dashboards/admin/assisted-checkout.tsx",
    ),
    route(
      "admin-dashboard/procurement-targets",
      "routes/dashboards/admin/procurement-targets.tsx",
    ),
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
    /*
     * The buyer-admin surface, inside the one admin dashboard rather than
     * beside it.
     *
     * A sub-admin is a narrower admin, not a different role, so they land on
     * /admin-dashboard and see fewer items. That is what use-dashboard-nav
     * already implements with `tiers`; a second top-level dashboard meant the
     * two disagreed about which was true. It also mirrors the backend, where
     * this lives at api/v1/admin/buyer-admin as a subfolder of admin.
     *
     * Folders under a role are per admin domain, not per feature: agent/,
     * supply/ and finance/ arrive here as those admins do. URLs follow the
     * folder, so a new domain is a directory and three lines rather than a
     * naming argument.
     *
     * `admin-dashboard/buyer-management` is gone with the page it pointed at.
     * That page read `{ buyers, total }` from an endpoint that returns a plain
     * array, so it rendered nothing; the working list lives here now.
     */
    route(
      "admin-dashboard/buyer",
      "routes/dashboards/admin/buyer/overview.tsx",
    ),
    route(
      "admin-dashboard/buyer/deliveries",
      "routes/dashboards/admin/buyer/deliveries.tsx",
    ),
  ]),
] satisfies RouteConfig;
