import { useEffect } from "react";
import { Navigate } from "react-router";
import { useAuth, usePageLoader } from "@debridgers/ui-web";

/*
 * This app only ever serves agents.
 * A signed-in agent lands on the dashboard; anyone else - signed out, or signed in as another role - goes to this app's own login rather than a cross-role dashboard that does not exist here.
 */
export default function Index() {
  const { user, isLoading }: ReturnType<typeof useAuth> = useAuth();
  const { showLoader, hideLoader } = usePageLoader();

  useEffect(() => {
    if (!isLoading) return;
    showLoader();
    return () => hideLoader();
  }, [isLoading, showLoader, hideLoader]);

  if (isLoading) return null;

  const target: string = user?.role === "agent" ? "/agent-dashboard" : "/login";

  return <Navigate to={target} replace />;
}
