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

/*
 * A 409 carrying this code means the account exists but was never verified.
 * register() has already reissued the OTP by that point, so it is the
 * verification path rather than a failure. Showing it as an error banner would
 * strand the user on the signup screen with no way forward.
 *
 * Read structurally instead of importing ApiError, which lives in the API
 * client. Pulling that in would drag the transport layer into this UI package,
 * which is the coupling the adapter exists to avoid.
 */
function isUnverifiedEmailError(error: unknown): boolean {
  const body = (error as { body?: { code?: unknown } } | null)?.body;
  return body?.code === "UNVERIFIED_EMAIL";
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
      lga: "",
      address: "",
      cv: undefined,
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

    const proceedToVerification = (): void => {
      setAwaitingVerification(true);

      if (onRequiresVerification) {
        onRequiresVerification(values.email, role);
        return;
      }

      adapter.navigate("/verify-email", { email: values.email, role });
    };

    try {
      /*
       * The role decides how its account is created, not this hook. A role with
       * its own endpoint supplies `register` in its config; everything else
       * falls through to the shared one. There is deliberately no branch on
       * which role this is, so a new role is a config entry and nothing here.
       */
      if (config.register) {
        await config.register(values, { first_name, last_name, role });
      } else {
        await adapter.register({
          first_name,
          last_name,
          email: values.email,
          password: values.password,
          role,
          phone: values.phone || undefined,
          referred_by_agent_code: values.referredByAgentCode || undefined,
        });
      }

      proceedToVerification();
    } catch (error) {
      if (isUnverifiedEmailError(error)) {
        proceedToVerification();
        return;
      }

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
