import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet } from "lucide-react";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { SubmitButton } from "../submit-button";
import { DashNumberInput } from "../dash-number-input";
import { formatFromKobo } from "../../utils/format-currency";
import {
  createWithdrawalSchema,
  type WithdrawalValues,
} from "../../schemas/agent/withdrawal";

/*
 * Presentation only: no data fetching, no routing, no useDialog.
 *
 * The consuming app wires this to the API through a thin glue component - see
 * app/components/dialogs/RequestPayoutDialog.tsx. That split is what lets this
 * be reused or storybooked without a server.
 */

export interface AgentRequestPayoutDialogProps {
  availableBalanceKobo: number;
  /** Amount is handed back in kobo, so the caller never converts. */
  onSubmitAmount: (amountKobo: number) => void | Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  error?: string | null;
  success: boolean;
}

export function AgentRequestPayoutDialog({
  availableBalanceKobo,
  onSubmitAmount,
  onClose,
  isSubmitting,
  error,
  success,
}: AgentRequestPayoutDialogProps) {
  const availableNaira = availableBalanceKobo / 100;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WithdrawalValues>({
    resolver: zodResolver(createWithdrawalSchema(availableNaira)),
    mode: "onChange",
    defaultValues: { amount: 0 },
  });

  /*
   * Success replaces the form rather than closing straight away, and the closer
   * is hidden so the confirmation cannot be dismissed before it is read. The
   * glue component owns the close timing.
   */
  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title="Payout requested" showCloser={false} />
        <DialogSuccessPanel
          title="We have your request"
          description="Your payout is queued for review. You will be notified once it is approved."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Request a payout"
        description="Money is sent to the bank account in your settings."
        onClose={onClose}
      />

      <div className="bg-bg-light flex items-center justify-between gap-3 rounded-xl px-4 py-3">
        <span className="text-text flex items-center gap-2 text-sm">
          <Wallet size={15} /> Available
        </span>
        <span className="font-syne text-heading text-base font-bold">
          {formatFromKobo(availableBalanceKobo)}
        </span>
      </div>

      <DialogErrorBanner message={error} />

      <form
        onSubmit={handleSubmit((values) =>
          /* Round at the boundary so a fractional naira cannot reach the ledger. */
          onSubmitAmount(Math.round(values.amount * 100)),
        )}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <DashNumberInput
            label="Amount"
            placeholder="0"
            error={errors.amount?.message}
            required
            {...register("amount", { valueAsNumber: true })}
          />

          <button
            type="button"
            onClick={() =>
              setValue("amount", availableNaira, { shouldValidate: true })
            }
            className="text-primary w-fit cursor-pointer text-xs font-medium underline underline-offset-2"
          >
            Request full balance
          </button>
        </div>

        <SubmitButton
          loading={isSubmitting}
          loadingText="Requesting..."
          className="rounded-full"
          disabled={availableBalanceKobo <= 0}
        >
          Request payout
        </SubmitButton>

        {availableBalanceKobo <= 0 && (
          <p className="text-text text-center text-xs">
            You have no available balance to withdraw yet.
          </p>
        )}
      </form>
    </div>
  );
}
