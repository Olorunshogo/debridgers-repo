import { useEffect } from "react";
import {
  AgentRequestPayoutDialog,
  useDialog,
  useDialogSubmission,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
} from "@debridgers/ui-web";
import { apiFetch } from "@debridgers/api-client";

/*
 * Glue between the dialog engine and the API.
 *
 * The presentation component in @debridgers/ui-web knows nothing about
 * fetching or routing; this file is the only place they meet. Registered as
 * REQUEST_PAYOUT in app/providers/dialog-registry.ts.
 */

/* onRequested lets the wallet page refresh its balance once the request lands. */
interface RequestPayoutDialogProps {
  availableBalanceKobo: number;
  onRequested?: () => void;
}

export default function RequestPayoutDialog({
  availableBalanceKobo,
  onRequested,
}: RequestPayoutDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { status, error, run, isSubmitting } = useDialogSubmission<void>();

  /*
   * Blocks Escape and backdrop dismissal while the request is in flight - a
   * half-submitted payout is not something to let someone click away from.
   */
  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  /*
   * Hold the success panel long enough to read, then close. Closing the instant
   * the promise resolves reads as if nothing happened.
   */
  useEffect(() => {
    if (status !== "success") return;
    onRequested?.();
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog, onRequested]);

  return (
    <AgentRequestPayoutDialog
      availableBalanceKobo={availableBalanceKobo}
      isSubmitting={isSubmitting}
      error={error}
      success={status === "success"}
      onClose={closeDialog}
      onSubmitAmount={(amountKobo) =>
        run(async () => {
          await apiFetch("/agent/withdrawals", {
            method: "POST",
            body: JSON.stringify({ amount_kobo: amountKobo }),
          });
        })
      }
    />
  );
}
