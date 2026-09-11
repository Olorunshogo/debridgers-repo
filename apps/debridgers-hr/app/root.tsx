import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import type { MetaFunction } from "react-router";
import { MotionConfig } from "framer-motion";
import "./styles.css";
import {
  DialogProvider,
  AuthProvider,
  PageLoaderProvider,
} from "@debridgers/ui-web";
import { DIALOG_REGISTRY } from "./providers/dialog-registry";
import { AppAuthAdapterProvider } from "./providers/auth-adapter";

export const meta: MetaFunction = () => [
  { title: "Debridgers HR" },
  {
    name: "description",
    content: "People and recruitment for Debridgers.",
  },
  { name: "robots", content: "noindex, nofollow" },
];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  /*
   * Fonts must be <link>s, not CSS @import.
   * React Router inlines styles.css into a <style> tag; an @import of Google
   * Fonts inside that tag can stop the browser applying the rest of the sheet,
   * which is what made the auth page look like unstyled HTML.
   */
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Syne:wght@400..800&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <PageLoaderProvider>
        <AuthProvider>
          <AppAuthAdapterProvider>
            <DialogProvider registry={DIALOG_REGISTRY}>
              <Outlet />
            </DialogProvider>
          </AppAuthAdapterProvider>
        </AuthProvider>
      </PageLoaderProvider>
    </MotionConfig>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <span className="font-syne text-primary text-2xl font-semibold">
          Debridgers
        </span>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-gray-200">
          <div className="bg-primary h-full w-full origin-left animate-[loading_1.5s_infinite_linear]" />
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
