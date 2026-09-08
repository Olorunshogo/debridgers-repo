import { useEffect } from "react";
import {
  DialogHeader,
  DialogErrorBanner,
  DialogSuccessPanel,
  PasswordInputField,
  SubmitButton,
  useDialog,
  useUpdatePassword,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
} from "@debridgers/ui-web";

/*
 * Update password, on the shared useUpdatePassword hook from @debridgers/ui-web.
 * One dialog, reused by every role's settings screen and by the app's own "you're still on a temporary password" nag (DashboardLayout), which is the only caller that overrides the copy below.
 * Registered as CHANGE_PASSWORD in app/providers/dialog-registry.ts.
 * `onChanged` fires once the new password is accepted, so the caller can stop asking.
 */

interface ChangePasswordDialogProps {
  onChanged?: () => void;
  title?: string;
  description?: string;
  successTitle?: string;
  successDescription?: string;
}

const DEFAULT_TITLE = "Update password";
const DEFAULT_DESCRIPTION = "Enter your old password and choose a new one.";
const DEFAULT_SUCCESS_TITLE = "Password updated";
const DEFAULT_SUCCESS_DESCRIPTION =
  "Use the new password the next time you sign in.";

export default function ChangePasswordDialog({
  onChanged,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  successTitle = DEFAULT_SUCCESS_TITLE,
  successDescription = DEFAULT_SUCCESS_DESCRIPTION,
}: ChangePasswordDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { form, submit, apiError, isSubmitting, done } = useUpdatePassword({
    onSuccess: onChanged,
  });

  /* Blocks dismissal mid-request; a half-submitted password change is not something to close out from under. */
  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [done, closeDialog]);

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title={successTitle} showCloser={false} />
        <DialogSuccessPanel
          title={successTitle}
          description={successDescription}
        />
      </div>
    );
  }

  const { register, formState } = form;

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title={title}
        description={description}
        onClose={closeDialog}
      />

      {apiError && <DialogErrorBanner message={apiError} />}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <PasswordInputField
          label="Old password"
          required
          autoComplete="current-password"
          placeholder="Your old password"
          disabled={isSubmitting}
          error={formState.errors.currentPassword?.message}
          {...register("currentPassword")}
        />

        <PasswordInputField
          label="New password"
          required
          autoComplete="new-password"
          placeholder="Create a new password"
          disabled={isSubmitting}
          error={formState.errors.password?.message}
          {...register("password")}
        />

        <PasswordInputField
          label="Confirm new password"
          required
          autoComplete="new-password"
          placeholder="Type it again"
          disabled={isSubmitting}
          error={formState.errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <SubmitButton
          variant="primary"
          loading={isSubmitting}
          loadingText="Updating..."
          /* mode: "onChange" in useUpdatePassword keeps isValid live from the first keystroke, same reasoning as the shared auth forms. */
          disabled={!formState.isValid}
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
