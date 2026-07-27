import { useState, useCallback } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginValues } from "../../schemas/auth/login";
import { useAuthAdapter, type LoginVariant } from "./auth-adapter";

/*
 * Owns login form state, validation, error mapping, and the post-login
 * redirect. The network call and navigation come from the adapter, so this file
 * contains no fetch, axios, cookie, Response, or router reference.
 */

export type { LoginVariant };

export interface UseLoginOptions {
  /*
   * The admin session is issued by a separate backend endpoint, so the variant
   * selects the call while the UI stays shared.
   */
  variant?: LoginVariant;
  onSuccess?: (role: string) => void;
}

export interface UseLoginResult {
  form: UseFormReturn<LoginValues>;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  apiError: string | null;
  clearApiError: () => void;
  isSubmitting: boolean;
}

export function useLogin(options: UseLoginOptions = {}): UseLoginResult {
  const { variant = "public", onSuccess } = options;
  const adapter = useAuthAdapter();

  const [apiError, setApiError] = useState<string | null>(null);

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
    }
  });

  return {
    form,
    submit,
    apiError,
    clearApiError,
    isSubmitting: form.formState.isSubmitting,
  };
}
