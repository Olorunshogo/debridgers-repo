import { Outlet } from "react-router";

/*
 * AuthFormShell owns the full viewport (image panel + form).
 * Do not wrap it in layout-max-width or a column flex shell - that fights
 * the two-pane auth chrome.
 */
export default function AuthLayout() {
  return <Outlet />;
}
