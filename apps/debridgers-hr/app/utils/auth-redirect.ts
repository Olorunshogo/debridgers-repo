import type { NavigateFunction } from "react-router";

const HR_DASHBOARD = "/hr-dashboard";

const ROLE_PATHS: Record<string, string> = {
  hr: HR_DASHBOARD,
  hiring_manager: HR_DASHBOARD,
  applicant: HR_DASHBOARD,
  employee: HR_DASHBOARD,
  admin: HR_DASHBOARD,
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

  if (intended && intended.startsWith(HR_DASHBOARD)) {
    navigate(intended);
    return;
  }

  navigate(path);
}
