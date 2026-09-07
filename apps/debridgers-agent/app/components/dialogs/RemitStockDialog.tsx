import { useEffect } from "react";
import {
  AgentRemitStockDialog,
  useDialog,
  useDialogSubmission,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
} from "@debridgers/ui-web";
import { apiFetch } from "@debridgers/api-client";

/*
 * Glue between the dialog engine and POST /agent/stock/remit. The presentation
 * component in @debridgers/ui-web knows nothing about fetching. Registered as
 * REMIT_STOCK in app/providers/dialog-registry.ts.
 */

interface RemitStockDialogProps {
  stockRequestId: number;
  productName: string;
  amountToRemitKobo: number;
  amountRemittedKobo: number;
  /** Lets the request-stock page refetch its list once the remittance lands. */
  onRemitted?: () => void;
}

export default function RemitStockDialog({
  stockRequestId,
  productName,
  amountToRemitKobo,
  amountRemittedKobo,
  onRemitted,
}: RemitStockDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { status, error, run, isSubmitting } = useDialogSubmission<void>();

  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (status !== "success") return;
    onRemitted?.();
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog, onRemitted]);

  return (
    <AgentRemitStockDialog
      productName={productName}
      amountToRemitKobo={amountToRemitKobo}
      amountRemittedKobo={amountRemittedKobo}
      isSubmitting={isSubmitting}
      error={error}
      success={status === "success"}
      onClose={closeDialog}
      onSubmitAmount={(amountKobo) =>
        run(async () => {
          await apiFetch("/agent/stock/remit", {
            method: "POST",
            body: JSON.stringify({
              stock_request_id: stockRequestId,
              amount_remitted: amountKobo,
            }),
          });
        })
      }
    />
  );
}
