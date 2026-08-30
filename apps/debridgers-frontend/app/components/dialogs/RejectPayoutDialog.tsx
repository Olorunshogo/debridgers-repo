import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DialogHeader,
  DialogErrorBanner,
  DashTextInput,
  useDialog,
  useDialogSubmission,
} from "@debridgers/ui-web";

/*
 * Rejecting a payout, registered as REJECT_PAYOUT.
 *
 * Was an inline panel that expanded inside the row, with the open row id and
 * the typed reason held as page state. The reason belongs to one decision about
 * one request, so it lives with that decision instead of on the page.
 */

interface RejectPayoutDialogProps {
  agentName?: string;
  /** Already formatted, so this component does no currency work. */
  amountLabel?: string;
  onReject?: (reason: string) => void | Promise<void>;
}

export default function RejectPayoutDialog({
  agentName = "this agent",
  amountLabel,
  onReject,
}: RejectPayoutDialogProps) {
  const { closeDialog } = useDialog();
  const { error, run, isSubmitting } = useDialogSubmission<boolean>();
  const [reason, setReason] = useState<string>("");

  async function handleReject(): Promise<void> {
    const succeeded = await run(async () => {
      await onReject?.(reason.trim());
      return true;
    });
    if (succeeded) closeDialog();
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Reject this payout?"
        description={`The request from ${agentName} will be turned down.`}
        showCloser={!isSubmitting}
        onClose={closeDialog}
      />

      <DialogErrorBanner message={error} />

      <div className="flex flex-col gap-2">
        <DashTextInput
          label="Reason (shown to the agent)"
          id="reject-payout-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Bank details do not match KYC"
        />
        {amountLabel && (
          <p className="text-body text-xs">
            Rejecting returns {amountLabel} to the agent&apos;s available
            balance.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={closeDialog}
          disabled={isSubmitting}
          className="border-line text-heading hover:bg-light-bg cursor-pointer rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleReject()}
          disabled={isSubmitting}
          className="bg-status-cancelled-fg inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          Confirm rejection
        </button>
      </div>
    </div>
  );
}
