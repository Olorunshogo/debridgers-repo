import { useEffect } from "react";
import { Navigate } from "react-router";
import { useAuth, usePageLoader } from "@debridgers/ui-web";

const CAREERS_ROLES = new Set(["applicant", "employee", "admin"]);

export default function Index() {
  const { user, isLoading }: ReturnType<typeof useAuth> = useAuth();
  const { showLoader, hideLoader } = usePageLoader();

  useEffect(() => {
    if (!isLoading) return;
    showLoader();
    return () => hideLoader();
  }, [isLoading, showLoader, hideLoader]);

  if (isLoading) return null;

  const target =
    user && CAREERS_ROLES.has(user.role) ? "/careers-dashboard" : "/login";

  return <Navigate to={target} replace />;
}
