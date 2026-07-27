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
import "./styles.css";
import { IntroAnimation } from "./components/landing/IntroAnimation";
import { DialogProvider } from "@debridgers/ui-web";
import { AuthProvider } from "./contexts/AuthContext";
import { DIALOG_REGISTRY } from "./providers/dialog-registry";
import { AppAuthAdapterProvider } from "./providers/auth-adapter";
import { CartProvider } from "./features/cart";

export const meta: MetaFunction = () => [
  { title: "Debridgers | Fresh Foodstuff at Market Prices in Kaduna" },
  {
    name: "description",
    content:
      "Debridgers delivers fresh foodstuff straight to your door or shop at the same price you would pay at Central Market. Rice, beans, oil and more. Serving Kaduna.",
  },
  {
    name: "keywords",
    content:
      "Fresh foodstuff delivery Kaduna, market price food delivery Nigeria, rice beans delivery Kaduna, Debridgers, affordable food delivery, Kaduna food delivery, fresh produce Nigeria",
  },
  // === Author and Robots
  { name: "author", content: "Debridgers Team" },
  { name: "robots", content: "index, follow" },
];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
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
    <AuthProvider>
      {/* Inside AuthProvider so a dialog can read the session */}
      <DialogProvider registry={DIALOG_REGISTRY}>
        {/* Inside the router and AuthProvider - the adapter needs both */}
        <AppAuthAdapterProvider>
          {/* One cart for every page - landing shop, buyer shop, checkout */}
          <CartProvider>
            <IntroAnimation />
            <Outlet />
          </CartProvider>
        </AppAuthAdapterProvider>
      </DialogProvider>
    </AuthProvider>
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
