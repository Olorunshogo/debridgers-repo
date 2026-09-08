import { Navigate } from "react-router";
import { useAuth } from "@debridgers/ui-web";

/*
 * This app only ever serves buyers.
 * A signed-in buyer lands on the dashboard; anyone else - signed out, or signed in as another role - goes to this app's own login rather than a cross-role dashboard that does not exist here.
 */
export default function Index() {
  const { user, isLoading }: ReturnType<typeof useAuth> = useAuth();

  if (isLoading) return null;

  const target: string = user?.role === "buyer" ? "/buyer-dashboard" : "/login";

  return <Navigate to={target} replace />;
}
