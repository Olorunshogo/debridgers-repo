import { useEffect, useState } from "react";
import {
  DialogHeader,
  DialogErrorBanner,
  DialogSuccessPanel,
  TextInputField,
  SubmitButton,
  useDialog,
  useDialogSubmission,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
} from "@debridgers/ui-web";
import { apiMutate } from "@debridgers/api-client";

/*
 * Invite code verification, on the dialog engine.
 *
 * Same story as the password dialog: it painted its own backdrop and carried its own max-w-md.
 * Registered as VERIFY_INVITE in app/providers/dialog-registry.ts.
 */

/* `onVerified` fires once the code is accepted, so the caller can stop asking. */
interface InviteVerificationDialogProps {
  onVerified?: () => void;
}

export default function InviteVerificationDialog({
  onVerified,
}: InviteVerificationDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { status, error, run, isSubmitting } = useDialogSubmission<void>();
  const [inviteCode, setInviteCode] = useState<string>("");

  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (status !== "success") return;
    onVerified?.();
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog, onVerified]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isSubmitting || !inviteCode.trim()) return;

    void run(async () => {
      await apiMutate("/admin/invites/verify", {
        method: "POST",
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
    });
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title="Invite verified" showCloser={false} />
        <DialogSuccessPanel
          title="Your account is active"
          description="You now have full access to the admin dashboard."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Verify your invite code"
        description="Enter the code from your invitation email to finish activating this account."
        onClose={closeDialog}
      />

      {error && <DialogErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInputField
          label="Invite code"
          name="invite_code"
          required
          placeholder="Paste the code from your email"
          value={inviteCode}
          disabled={isSubmitting}
          onChange={(e) => setInviteCode(e.target.value)}
        />

        <SubmitButton
          variant="primary"
          loading={isSubmitting}
          loadingText="Verifying..."
          disabled={!inviteCode.trim()}
        >
          Verify code
        </SubmitButton>
      </form>
    </div>
  );
}
