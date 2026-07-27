import { useState } from "react";
import {
  AuthTabPanel,
  AuthCredentialsForm,
  AuthSignupForm,
  useDialog,
  type AuthTab,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { useLogin, useSignup, ROLE_SIGNUP_CONFIG } from "../../features/auth";

/*
 * The checkout auth gate, on the dialog engine.
 *
 * Replaces the hand-rolled AuthModal, which duplicated login and signup form
 * state, its own zod safeParse calls and its own backdrop. Both forms now come
 * from the shared useLogin / useSignup hooks, so this file is only composition
 * plus the tab choice.
 */

const LOGIN_FIELDS: readonly AuthFieldDescriptor[] = [
  {
    name: "email",
    label: "Email address",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Your password",
    autoComplete: "current-password",
  },
];

interface AuthDialogProps {
  /** Called once the buyer is authenticated, so the caller can resume checkout. */
  onAuthenticated?: () => void;
}

export default function AuthDialog({ onAuthenticated }: AuthDialogProps) {
  const { closeDialog } = useDialog();
  const [tab, setTab] = useState<AuthTab>("login");

  function finish(): void {
    onAuthenticated?.();
    closeDialog();
  }

  /* Both hooks are always called - hooks cannot be conditional - and only the
     active tab's form is rendered. */
  const login = useLogin({ onSuccess: finish });
  const signup = useSignup({
    config: ROLE_SIGNUP_CONFIG.buyer,
    /* Registration needs email verification, so it cannot resume checkout
       directly; useSignup navigates to /verify-email and the dialog closes with
       the route change. */
    onRequiresVerification: () => closeDialog(),
  });

  return (
    <AuthTabPanel
      activeTab={tab}
      onTabChange={setTab}
      onClose={closeDialog}
      apiError={tab === "login" ? login.apiError : signup.apiError}
    >
      {tab === "login" ? (
        <AuthCredentialsForm
          fields={LOGIN_FIELDS}
          form={login.form}
          onSubmit={login.submit}
          isSubmitting={login.isSubmitting}
          submitLabel="Log In"
          submittingLabel="Logging in..."
        />
      ) : (
        <AuthSignupForm
          roles={[
            {
              value: "buyer",
              label: "Buyer",
              fields: ROLE_SIGNUP_CONFIG.buyer.fields,
            },
          ]}
          activeRole="buyer"
          onRoleChange={() => undefined}
          form={signup.form}
          onSubmit={signup.submit}
          isSubmitting={signup.isSubmitting}
        />
      )}
    </AuthTabPanel>
  );
}
