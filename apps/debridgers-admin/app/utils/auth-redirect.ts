import type { NavigateFunction } from "react-router";

type UserRole = "admin" | "agent" | "buyer";

const ROLE_PATHS: Record<UserRole, string> = {
  admin: "/admin-dashboard",
  agent: "/agent-dashboard",
  buyer: "/buyer-dashboard",
};

/*
 * Where to send the user once they finish authenticating, when something started the sign-in on their behalf.
 * The public shop's checkout gate is the case this exists for: a buyer clicks Checkout, signs in or registers, and should land on checkout rather than the dashboard's front page. Login and email verification take different routes through the auth hooks, so the intent is parked here instead of threaded through both.
 * sessionStorage, not localStorage: the intent belongs to this tab and this sitting, and must not outlive it.
 */
const POST_AUTH_REDIRECT_KEY = "debridgers_post_auth_redirect";

export function setPostAuthRedirect(path: string): void {
  try {
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
  } catch {
    /* Private mode or storage disabled - fall back to the role's dashboard. */
  }
}

/* Read-and-clear: an intent must never be reused by a later, unrelated login. */
function takePostAuthRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    if (path) sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return path;
  } catch {
    return null;
  }
}

export function clearPostAuthRedirect(): void {
  try {
    sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  } catch {
    /* Nothing to clear if storage is unavailable. */
  }
}

export function redirectAfterAuth(navigate: NavigateFunction, role: string) {
  const intended = takePostAuthRedirect();
  const path = ROLE_PATHS[role as UserRole] ?? ROLE_PATHS.buyer;

  /* Honour the intent only for the role it was recorded for. An agent or admin signing in on the same tab gets their own dashboard, not a buyer checkout. */
  if (intended && intended.startsWith(path)) {
    navigate(intended);
    return;
  }

  navigate(path);
}
