import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  AuthAdapterProvider,
  useAuth,
  type AuthAdapter,
  type VerifiedSession,
} from "@debridgers/ui-web";
import {
  register as registerRequest,
  forgotPassword as forgotPasswordRequest,
  resetPassword as resetPasswordRequest,
  verifyEmail as verifyEmailRequest,
  resendOtp as resendOtpRequest,
  storeTokens,
  apiMutate,
} from "@debridgers/api-client";
import { redirectAfterAuth } from "../utils/auth-redirect";
import { splitFullName } from "../utils/name";

/*
 * Wires the shared auth hooks in @debridgers/ui-web to this app's real
 * transport, session, and router.
 *
 * This is the only place those three concerns meet the hooks. Keeping it here
 * rather than inside ui-web is what lets the hooks be shared without dragging
 * the API client and router into a UI package.
 */
export function AppAuthAdapterProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { login, syncUserFromToken } = useAuth();

  const adapter = useMemo<AuthAdapter>(
    () => ({
      login,

      register: (payload) =>
        registerRequest(payload as Parameters<typeof registerRequest>[0]),

      forgotPassword: (email) => forgotPasswordRequest(email),

      resetPassword: (token, password) =>
        resetPasswordRequest({ token, password }),

      /* Buyer's DTO predates the shared hook and stayed on old_password. */
      updatePassword: (currentPassword, newPassword) =>
        apiMutate("/buyer/password/change", {
          method: "PATCH",
          body: JSON.stringify({
            old_password: currentPassword,
            new_password: newPassword,
          }),
        }),

      verifyEmail: (email, otp) => verifyEmailRequest({ email, otp }),

      resendOtp: (email) => resendOtpRequest(email),

      /*
       * Returns the role when a session was actually issued, or null when the
       * backend verified the email without logging the user in. The hook uses
       * that to decide between redirecting to a dashboard and sending the user
       * to /login.
       */
      storeSession: (session: VerifiedSession): string | null => {
        if (!session?.accessToken || !session?.refreshToken) return null;
        storeTokens(session.accessToken, session.refreshToken);
        return syncUserFromToken()?.role ?? "buyer";
      },

      navigate: (path, state) => navigate(path, state ? { state } : undefined),

      redirectAfterAuth: (role) => redirectAfterAuth(navigate, role),

      splitFullName,
    }),
    [login, navigate, syncUserFromToken],
  );

  return (
    <AuthAdapterProvider adapter={adapter}>{children}</AuthAdapterProvider>
  );
}
