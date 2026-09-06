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
    route("signup", "routes/auth/signup.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
    route("verify-email", "routes/auth/verify-email.tsx"),
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
] satisfies RouteConfig;
