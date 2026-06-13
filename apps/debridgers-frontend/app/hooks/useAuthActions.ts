import { useCallback } from "react";
import { BASE_BACKEND_URL, storeTokens } from "@debridgers/api-client";
import { useAuth } from "../contexts/AuthContext";
import { splitFullName } from "../utils/name";

export interface AuthActionFieldError {
  field: string;
  message: string;
}

export interface AuthActionError extends Error {
  status?: number;
  code?: string;
  fields?: AuthActionFieldError[];
}

export interface RegisterBuyerInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  referredByAgentCode?: string;
}

export interface RegisterBuyerResult {
  requiresEmailVerification: boolean;
  role: "buyer";
}

interface AuthActionResponse {
  message?: string;
  code?: string;
  errors?: AuthActionFieldError[];
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

function createAuthActionError(params: {
  message: string;
  status?: number;
  code?: string;
  fields?: AuthActionFieldError[];
}): AuthActionError {
  return Object.assign(new Error(params.message), params);
}

export function isAuthActionError(error: unknown): error is AuthActionError {
  return error instanceof Error;
}

export function useAuthActions(): {
  loginWithPassword: (
    email: string,
    password: string,
  ) => Promise<"buyer" | "agent" | "admin">;
  registerBuyer: (input: RegisterBuyerInput) => Promise<RegisterBuyerResult>;
} {
  const { login, syncUserFromToken } = useAuth();

  const loginWithPassword = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<"buyer" | "agent" | "admin"> => {
      return login(email, password);
    },
    [login],
  );

  const registerBuyer = useCallback(
    async (input: RegisterBuyerInput): Promise<RegisterBuyerResult> => {
      const { first_name, last_name } = splitFullName(input.fullName.trim());

      let response: Response;
      try {
        response = await fetch(`${BASE_BACKEND_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            first_name,
            last_name,
            email: input.email,
            password: input.password,
            role: "buyer",
            phone: input.phone || undefined,
            referred_by_agent_code: input.referredByAgentCode || undefined,
          }),
        });
      } catch {
        throw createAuthActionError({
          message: "Network error. Please try again.",
        });
      }

      const json: AuthActionResponse = await response
        .json()
        .catch(() => ({}) as AuthActionResponse);

      if (!response.ok) {
        throw createAuthActionError({
          message: json.message ?? "Registration failed.",
          status: response.status,
          code: json.code,
          fields: json.errors,
        });
      }

      if (json.data?.accessToken) {
        storeTokens(json.data.accessToken, json.data.refreshToken ?? "");
        syncUserFromToken();
        return {
          requiresEmailVerification: false,
          role: "buyer",
        };
      }

      return {
        requiresEmailVerification: true,
        role: "buyer",
      };
    },
    [syncUserFromToken],
  );

  return {
    loginWithPassword,
    registerBuyer,
  };
}
