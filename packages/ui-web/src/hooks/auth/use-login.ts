import { useState, useCallback } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginValues } from "../../schemas/auth/login";
import { useAuthAdapter, type LoginVariant } from "./auth-adapter";
import { applyServerFieldErrors } from "../../lib/server-errors";

/*
 * Owns login form state, validation, error mapping, and the post-login redirect.
 * The network call and navigation come from the adapter, so this file contains no fetch, axios, cookie, Response, or router reference.
 */

/*
 * The backend reissues a fresh OTP the moment this fires.
 * By the time a caller acts on `unverifiedEmail`, a code is already waiting.
 * Read structurally rather than importing ApiError, to keep the transport layer out of this UI package.
 */
function isUnverifiedEmailError(error: unknown): boolean {
  const body = (error as { body?: { code?: unknown } } | null)?.body;
  return body?.code === "UNVERIFIED_EMAIL";
}

export type { LoginVariant };

/*
 * `variant`: the admin session is issued by a separate backend endpoint, so the variant selects the call while the UI stays shared.
 */
export interface UseLoginOptions {
  variant?: LoginVariant;
  onSuccess?: (role: string) => void;
}

export interface UseLoginResult {
  form: UseFormReturn<LoginValues>;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  apiError: string | null;
  clearApiError: () => void;
  isSubmitting: boolean;
  /*
   * Set when login failed because the account exists but has not verified its email yet.
   * Lets the page offer an explicit way back to verify-email instead of a dead-end error.
   */
  unverifiedEmail: string | null;
  goToVerifyEmail: () => void;
}

export function useLogin(options: UseLoginOptions = {}): UseLoginResult {
  const { variant = "public", onSuccess } = options;
  const adapter = useAuthAdapter();

  const [apiError, setApiError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const clearApiError = useCallback((): void => {
    setApiError(null);
  }, []);

  const submit = form.handleSubmit(async (values: LoginValues) => {
    setApiError(null);
    setUnverifiedEmail(null);
    try {
      const role = await adapter.login(values.email, values.password, variant);
      if (onSuccess) {
        onSuccess(role);
        return;
      }
      adapter.redirectAfterAuth(role);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      applyServerFieldErrors(error, form);
      if (isUnverifiedEmailError(error)) {
        setUnverifiedEmail(values.email);
      }
    }
  });

  const goToVerifyEmail = useCallback((): void => {
    if (!unverifiedEmail) return;
    adapter.navigate("/verify-email", { email: unverifiedEmail });
  }, [unverifiedEmail, adapter]);

  return {
    form,
    submit,
    apiError,
    clearApiError,
    isSubmitting: form.formState.isSubmitting,
    unverifiedEmail,
    goToVerifyEmail,
  };
}
