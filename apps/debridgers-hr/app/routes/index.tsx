import { useEffect } from "react";
import { Navigate } from "react-router";
import { useAuth, usePageLoader } from "@debridgers/ui-web";

const HR_ROLES = new Set([
  "hr",
  "hiring_manager",
  "applicant",
  "employee",
  "admin",
]);

export default function Index() {
  const { user, isLoading }: ReturnType<typeof useAuth> = useAuth();
  const { showLoader, hideLoader } = usePageLoader();

  useEffect(() => {
    if (!isLoading) return;
    showLoader();
    return () => hideLoader();
  }, [isLoading, showLoader, hideLoader]);

  if (isLoading) return null;

  const target = user && HR_ROLES.has(user.role) ? "/hr-dashboard" : "/login";

  return <Navigate to={target} replace />;
}
