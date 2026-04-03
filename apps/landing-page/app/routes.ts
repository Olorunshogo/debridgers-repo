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
    route("contact", "routes/landing/contact.tsx"),
    route("agents", "routes/landing/agents.tsx"),
  ]),

  // === Auth Routes
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("signup", "routes/auth/signup.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
  ]),

  // === Buyer Dashboard
  layout("routes/dashboards/buyer/layout.tsx", [
    route("buyer-dashboard", "routes/dashboards/buyer/overview.tsx"),
    route("buyer-dashboard/orders", "routes/dashboards/buyer/orders.tsx"),
    route("buyer-dashboard/shop", "routes/dashboards/buyer/shop.tsx"),
    route("buyer-dashboard/checkout", "routes/dashboards/buyer/checkout.tsx"),
    route(
      "buyer-dashboard/notification",
      "routes/dashboards/buyer/notification.tsx",
    ),
    route("buyer-dashboard/settings", "routes/dashboards/buyer/settings.tsx"),
  ]),

  // === Agent Dashboard
  layout("routes/dashboards/agent/layout.tsx", [
    route("agent-dashboard", "routes/dashboards/agent/overview.tsx"),
    route("agent-dashboard/reports", "routes/dashboards/agent/reports.tsx"),
    route(
      "agent-dashboard/commissions",
      "routes/dashboards/agent/commissions.tsx",
    ),
    route(
      "agent-dashboard/notification",
      "routes/dashboards/agent/notification.tsx",
    ),
    route("agent-dashboard/settings", "routes/dashboards/agent/settings.tsx"),
  ]),

  // === Admin Dashboard
  layout("routes/dashboards/admin/layout.tsx", [
    route("admin-dashboard", "routes/dashboards/admin/overview.tsx"),
    route("admin-dashboard/agents", "routes/dashboards/admin/agents.tsx"),
    route("admin-dashboard/buyers", "routes/dashboards/admin/buyers.tsx"),
    route("admin-dashboard/settings", "routes/dashboards/admin/settings.tsx"),
  ]),
] satisfies RouteConfig;
