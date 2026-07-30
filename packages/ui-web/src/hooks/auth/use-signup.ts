import { useState, useCallback } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthAdapter } from "./auth-adapter";
import type {
  RoleSignupConfig,
  SignupFormValues,
} from "../../types/signup-config";

/*
 * Signup for any self-registerable role. The role's schema, fields, and
 * redirect all come from ROLE_SIGNUP_CONFIG, so adding a role (farmer) needs no
 * change here.
 */

export interface UseSignupOptions {
  /* The role's schema, fields, and redirect all come from its config, so this
     hook never branches on which role it is handling. */
  config: RoleSignupConfig;
  onRequiresVerification?: (email: string, role: string) => void;
}

export interface UseSignupResult {
  form: UseFormReturn<SignupFormValues>;
  config: RoleSignupConfig;
  submit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  apiError: string | null;
  clearApiError: () => void;
  isSubmitting: boolean;
  /** True once registration succeeded and email verification is pending. */
  awaitingVerification: boolean;
}

export function useSignup(options: UseSignupOptions): UseSignupResult {
  const { config, onRequiresVerification } = options;
  const adapter = useAuthAdapter();
  const role = config.role;

  const [apiError, setApiError] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] =
    useState<boolean>(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(config.schema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      referredByAgentCode: "",
    },
  });

  const clearApiError = useCallback((): void => {
    setApiError(null);
  }, []);

  const submit = form.handleSubmit(async (values: SignupFormValues) => {
    setApiError(null);
    const { first_name, last_name } = adapter.splitFullName(
      values.fullName.trim(),
    );

    try {
      await adapter.register({
        first_name,
        last_name,
        email: values.email,
        password: values.password,
        role,
        phone: values.phone || undefined,
        referred_by_agent_code: values.referredByAgentCode || undefined,
      });

      setAwaitingVerification(true);

      if (onRequiresVerification) {
        onRequiresVerification(values.email, role);
        return;
      }

      adapter.navigate("/verify-email", { email: values.email, role });
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Could not create your account. Please try again.",
      );
    }
  });

  return {
    form,
    config,
    submit,
    apiError,
    clearApiError,
    isSubmitting: form.formState.isSubmitting,
    awaitingVerification,
  };
}
