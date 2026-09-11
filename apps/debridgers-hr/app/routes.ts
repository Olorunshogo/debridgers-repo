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

  layout("routes/dashboards/hr/layout.tsx", [
    route("hr-dashboard", "routes/dashboards/hr/overview.tsx"),
    route("hr-dashboard/recruitment", "routes/dashboards/hr/recruitment.tsx"),
    route(
      "hr-dashboard/recruitment/jobs/:id",
      "routes/dashboards/hr/recruitment.job.tsx",
    ),
    route("hr-dashboard/applications", "routes/dashboards/hr/applications.tsx"),
    route("hr-dashboard/offers", "routes/dashboards/hr/offers.tsx"),
    route("hr-dashboard/contracts", "routes/dashboards/hr/contracts.tsx"),
    route("hr-dashboard/people", "routes/dashboards/hr/stub.people.tsx"),
    route(
      "hr-dashboard/performance",
      "routes/dashboards/hr/stub.performance.tsx",
    ),
    route("hr-dashboard/reports", "routes/dashboards/hr/stub.reports.tsx"),
    route("hr-dashboard/policies", "routes/dashboards/hr/stub.policies.tsx"),
    route("hr-dashboard/analytics", "routes/dashboards/hr/stub.analytics.tsx"),
  ]),
] satisfies RouteConfig;
