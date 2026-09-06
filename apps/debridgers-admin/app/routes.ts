import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  // === Root Redirect
  index("routes/index.tsx"),

  // === Auth
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
  ]),

  // === Admin Dashboard
  layout("routes/dashboards/admin/layout.tsx", [
    route("admin-dashboard", "routes/dashboards/admin/overview.tsx"),
    route("admin-dashboard/agents", "routes/dashboards/admin/agents.tsx"),
    route("admin-dashboard/kyc", "routes/dashboards/admin/kyc.tsx"),
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
    route(
      "admin-dashboard/deliveries",
      "routes/dashboards/admin/deliveries.tsx",
    ),
    route(
      "admin-dashboard/deliveries/:orderId/verify",
      "routes/dashboards/admin/deliveries.orderId.verify.tsx",
    ),
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
