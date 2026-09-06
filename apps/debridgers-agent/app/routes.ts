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
] satisfies RouteConfig;
