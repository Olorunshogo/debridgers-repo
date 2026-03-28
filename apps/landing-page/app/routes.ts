import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  layout("routes/landing/layout.tsx", [
    index("routes/landing/home.tsx"),
    route("contact", "routes/landing/contact.tsx"),
  ]),

  layout("routes/auth/layout.tsx", [
    // route("login", "routes/auth/login"),
    // route("forgotten-password", "routes/auth/forgotten-password"),
    // route("signup", "routes/auth/signup"),
  ]),
] satisfies RouteConfig;
