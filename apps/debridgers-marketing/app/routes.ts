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
     * Terms, the agent agreement and the privacy policy are the same renderer over different data, so publishing another one is a content file and a registry entry rather than a route and a page.
     */
    route("legal/:slug", "routes/marketing/legal.$slug.tsx"),
  ]),

  // === Auth Routes
  /*
   * Marketing has no auth of its own - /login and /signup are role pickers that redirect to the chosen role's own subdomain app, which owns the real forms (see features/auth/public-roles.ts).
   * Admin isn't offered here on purpose: its login/register URLs live on debridgers-admin and are not advertised on this public page.
   */
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("signup", "routes/auth/signup.tsx"),
  ]),
] satisfies RouteConfig;
