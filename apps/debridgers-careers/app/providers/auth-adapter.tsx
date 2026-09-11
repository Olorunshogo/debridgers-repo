import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  AuthAdapterProvider,
  useAuth,
  type AuthAdapter,
  type VerifiedSession,
} from "@debridgers/ui-web";
import {
  forgotPassword as forgotPasswordRequest,
  resetPassword as resetPasswordRequest,
  verifyEmail as verifyEmailRequest,
  resendOtp as resendOtpRequest,
  storeTokens,
} from "@debridgers/api-client";
import { redirectAfterAuth } from "../utils/auth-redirect";
import { splitFullName } from "../utils/name";

export function AppAuthAdapterProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { login, syncUserFromToken } = useAuth();

  const adapter = useMemo<AuthAdapter>(
    () => ({
      login,

      register: async () => {
        throw new Error("Self-registration is not available on Careers.");
      },

      forgotPassword: (email) => forgotPasswordRequest(email),

      resetPassword: (token, password) =>
        resetPasswordRequest({ token, password }),

      updatePassword: async () => {
        throw new Error("Password change is not wired for Careers yet.");
      },

      verifyEmail: (email, otp) => verifyEmailRequest({ email, otp }),

      resendOtp: (email) => resendOtpRequest(email),

      storeSession: (session: VerifiedSession): string | null => {
        if (!session?.accessToken || !session?.refreshToken) return null;
        storeTokens(session.accessToken, session.refreshToken);
        return syncUserFromToken()?.role ?? "applicant";
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
