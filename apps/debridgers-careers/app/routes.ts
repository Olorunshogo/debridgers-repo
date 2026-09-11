import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),

  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("verify-email", "routes/auth/verify-email.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
  ]),

  route("careers", "routes/careers/index.tsx"),
  route("careers/:id", "routes/careers/job.tsx"),

  layout("routes/dashboards/careers/layout.tsx", [
    route("careers-dashboard", "routes/dashboards/careers/overview.tsx"),
    route(
      "careers-dashboard/recruitment",
      "routes/dashboards/careers/recruitment.tsx",
    ),
    route(
      "careers-dashboard/recruitment/jobs/:id",
      "routes/dashboards/careers/recruitment.job.tsx",
    ),
    route(
      "careers-dashboard/applications",
      "routes/dashboards/careers/applications.tsx",
    ),
    route("careers-dashboard/offers", "routes/dashboards/careers/offers.tsx"),
    route(
      "careers-dashboard/contracts",
      "routes/dashboards/careers/contracts.tsx",
    ),
    route(
      "careers-dashboard/people",
      "routes/dashboards/careers/stub.people.tsx",
    ),
    route(
      "careers-dashboard/performance",
      "routes/dashboards/careers/stub.performance.tsx",
    ),
    route(
      "careers-dashboard/reports",
      "routes/dashboards/careers/stub.reports.tsx",
    ),
    route(
      "careers-dashboard/policies",
      "routes/dashboards/careers/stub.policies.tsx",
    ),
    route(
      "careers-dashboard/analytics",
      "routes/dashboards/careers/stub.analytics.tsx",
    ),
  ]),
] satisfies RouteConfig;
