import LoginPage from "./login";

/*
 * Admin entry point. Renders the shared login page against the admin login
 * endpoint, which is what LoginPage's `variant` prop was built for - nothing
 * passed it until now, so /auth/admin/login was never reachable and
 * adminLogin() in the API client was dead code.
 */
export default function AdminLoginPage() {
  return <LoginPage variant="admin" />;
}
