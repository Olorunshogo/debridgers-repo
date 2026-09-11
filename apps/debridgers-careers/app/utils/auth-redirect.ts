import type { NavigateFunction } from "react-router";

const CAREERS_DASHBOARD = "/careers-dashboard";

const ROLE_PATHS: Record<string, string> = {
  applicant: CAREERS_DASHBOARD,
  employee: CAREERS_DASHBOARD,
  admin: CAREERS_DASHBOARD,
};

const POST_AUTH_REDIRECT_KEY = "debridgers_post_auth_redirect";

export function setPostAuthRedirect(path: string): void {
  try {
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
  } catch {
    /* ignore */
  }
}

function takePostAuthRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    if (path) sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return path;
  } catch {
    return null;
  }
}

export function redirectAfterAuth(navigate: NavigateFunction, role: string) {
  const intended = takePostAuthRedirect();
  const path = ROLE_PATHS[role] ?? "/login";

  if (intended && intended.startsWith(CAREERS_DASHBOARD)) {
    navigate(intended);
    return;
  }

  navigate(path);
}
