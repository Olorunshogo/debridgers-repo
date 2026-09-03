import { useEffect } from "react";
import {
  DialogHeader,
  DialogErrorBanner,
  DialogSuccessPanel,
  PasswordInputField,
  SubmitButton,
  useDialog,
  useDialogSubmission,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
} from "@debridgers/ui-web";
import { apiMutate } from "@debridgers/api-client";
import { useState } from "react";
import {
  validatePasswordForm,
  type ChangePasswordForm,
} from "../../utils/password-validation";

/*
 * Admin password change, on the dialog engine.
 *
 * Was a hand-rolled overlay that painted its own backdrop and carried its own
 * copy of the max-w-md bug. Going through the engine gives it focus trapping,
 * scroll locking and the shared panel width for free.
 *
 * Dismissable: backdrop, Escape and the X closer all work. It is a prompt, not
 * a gate. An admin who cannot get past it cannot use the dashboard they just
 * signed in to.
 *
 * Registered as CHANGE_PASSWORD in app/providers/dialog-registry.ts.
 */

interface ChangePasswordDialogProps {
  /** Fires once the new password is accepted, so the caller can stop asking. */
  onChanged?: () => void;
}

const EMPTY_FORM: ChangePasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function ChangePasswordDialog({
  onChanged,
}: ChangePasswordDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { status, error, run, isSubmitting } = useDialogSubmission<void>();
  const [form, setForm] = useState<ChangePasswordForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<ChangePasswordForm>>(
    {},
  );

  /* Blocks dismissal mid-request; a half-submitted password change is not
     something to close out from under. */
  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (status !== "success") return;
    onChanged?.();
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog, onChanged]);

  function update(field: keyof ChangePasswordForm, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validatePasswordForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});

    void run(async () => {
      await apiMutate("/admin/password/change", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      });
    });
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title="Password updated" showCloser={false} />
        <DialogSuccessPanel
          title="Your password has been changed"
          description="Use the new password the next time you sign in."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Secure your account"
        description="You are still on the temporary password you were invited with. Set a permanent one to keep the account yours."
        onClose={closeDialog}
      />

      {error && <DialogErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordInputField
          label="Temporary password"
          name="current_password"
          required
          autoComplete="current-password"
          placeholder="The password from your invite"
          value={form.current_password}
          error={fieldErrors.current_password}
          disabled={isSubmitting}
          onChange={(e) => update("current_password", e.target.value)}
        />

        <PasswordInputField
          label="New password"
          name="new_password"
          required
          autoComplete="new-password"
          placeholder="Create a new password"
          value={form.new_password}
          error={fieldErrors.new_password}
          disabled={isSubmitting}
          onChange={(e) => update("new_password", e.target.value)}
        />

        <PasswordInputField
          label="Confirm new password"
          name="confirm_password"
          required
          autoComplete="new-password"
          placeholder="Type it again"
          value={form.confirm_password}
          error={fieldErrors.confirm_password}
          disabled={isSubmitting}
          onChange={(e) => update("confirm_password", e.target.value)}
        />

        <SubmitButton
          variant="primary"
          loading={isSubmitting}
          loadingText="Updating..."
        >
          Update password
        </SubmitButton>
      </form>

      <p className="text-body text-center text-xs">
        At least 8 characters, with an uppercase letter, a number and a special
        character.
      </p>
    </div>
  );
}
