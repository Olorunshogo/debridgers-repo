import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { SubmitButton } from "../submit-button";
import { NumberInputField } from "../number-input-field";
import { formatFromKobo } from "../../utils/format-currency";

/*
 * Presentation only: no data fetching, no routing, no useDialog.
 *
 * Wired to POST /agent/stock/remit through a thin glue component in the agent
 * app - see app/components/dialogs/RemitStockDialog.tsx. Remittance is an
 * internal ledger action against a fulfilled consignment, not a real payment.
 */

export interface AgentRemitStockDialogProps {
  productName: string;
  amountToRemitKobo: number;
  amountRemittedKobo: number;
  /** Amount is handed back in kobo, so the caller never converts. */
  onSubmitAmount: (amountKobo: number) => void | Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  error?: string | null;
  success: boolean;
}

export function AgentRemitStockDialog({
  productName,
  amountToRemitKobo,
  amountRemittedKobo,
  onSubmitAmount,
  onClose,
  isSubmitting,
  error,
  success,
}: AgentRemitStockDialogProps) {
  const outstandingKobo: number = Math.max(
    0,
    amountToRemitKobo - amountRemittedKobo,
  );
  const outstandingNaira: number = outstandingKobo / 100;

  const [amount, setAmount] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title="Remittance recorded" showCloser={false} />
        <DialogSuccessPanel
          title="Payment logged"
          description="Your remittance against this consignment has been recorded."
        />
      </div>
    );
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    const naira: number = parseFloat(amount);
    if (isNaN(naira) || naira <= 0) {
      setLocalError("Enter an amount greater than zero.");
      return;
    }
    if (Math.round(naira * 100) > outstandingKobo) {
      setLocalError(
        `That is more than the ${formatFromKobo(outstandingKobo)} still owed.`,
      );
      return;
    }
    setLocalError(null);
    void onSubmitAmount(Math.round(naira * 100));
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Remit for this consignment"
        description={`Record a payment against ${productName}. Partial payments are fine.`}
        onClose={onClose}
      />

      <div className="bg-light-bg flex flex-col gap-2 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body flex items-center gap-2 text-sm">
            <PackageCheck size={15} /> Remitted
          </span>
          <span className="text-heading text-sm font-semibold">
            {formatFromKobo(amountRemittedKobo)} /{" "}
            {formatFromKobo(amountToRemitKobo)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-body text-sm">Still owed</span>
          <span className="font-syne text-heading text-base font-bold">
            {formatFromKobo(outstandingKobo)}
          </span>
        </div>
      </div>

      <DialogErrorBanner message={error ?? localError} />

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <NumberInputField
          label="Amount"
          placeholder="0"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          type="button"
          onClick={() => setAmount(String(outstandingNaira))}
          className="text-primary w-fit cursor-pointer text-xs font-medium underline underline-offset-2"
        >
          Remit the full balance
        </button>

        <SubmitButton
          variant="block"
          loading={isSubmitting}
          loadingText="Recording..."
          className="rounded-full"
          disabled={outstandingKobo <= 0}
        >
          Record remittance
        </SubmitButton>

        {outstandingKobo <= 0 && (
          <p className="text-body text-center text-xs">
            This consignment is fully remitted.
          </p>
        )}
      </form>
    </div>
  );
}
