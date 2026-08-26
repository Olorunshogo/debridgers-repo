import { CreditCard, Wallet } from "lucide-react";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { formatFromKobo } from "../../utils/format-currency";

/*
 * Presentation only: no data fetching, no routing, no useDialog.
 *
 * Every figure here is passed in already priced by the server, because the
 * amount shown at checkout and the amount charged have to come from the same
 * place. This component must never compute a total from a cart.
 */

export type BuyerPaymentMethod = "wallet" | "paystack";

export interface BuyerPaymentMethodDialogProps {
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
  walletBalanceKobo: number;
  onSelectMethod: (method: BuyerPaymentMethod) => void | Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  /** Which option is mid-flight, so only that row shows a busy state. */
  pendingMethod?: BuyerPaymentMethod | null;
  error?: string | null;
  success: boolean;
}

export function BuyerPaymentMethodDialog({
  itemsTotalKobo,
  deliveryFeeKobo,
  handlingFeeKobo,
  totalKobo,
  walletBalanceKobo,
  onSelectMethod,
  onClose,
  isSubmitting,
  pendingMethod,
  error,
  success,
}: BuyerPaymentMethodDialogProps) {
  const shortfallKobo = totalKobo - walletBalanceKobo;
  const walletCovers = shortfallKobo <= 0;

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title="Payment complete" showCloser={false} />
        <DialogSuccessPanel
          title="Your order is paid"
          description="We are preparing it now. You can follow its progress from your orders page."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Choose how to pay"
        description="Your order is reserved. It is not paid until you complete this step."
        onClose={onClose}
      />

      {error && <DialogErrorBanner message={error} />}

      <dl className="bg-light-bg flex flex-col gap-2 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body text-sm">Items</dt>
          <dd className="text-heading font-syne text-sm font-medium">
            {formatFromKobo(itemsTotalKobo)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body text-sm">Delivery</dt>
          <dd className="text-heading font-syne text-sm font-medium">
            {deliveryFeeKobo === 0 ? "Free" : formatFromKobo(deliveryFeeKobo)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body text-sm">Handling</dt>
          <dd className="text-heading font-syne text-sm font-medium">
            {formatFromKobo(handlingFeeKobo)}
          </dd>
        </div>
        <div className="border-input-border mt-1 flex items-center justify-between gap-3 border-t pt-2">
          <dt className="text-heading font-syne font-medium">Total</dt>
          <dd className="text-heading font-syne font-semibold">
            {formatFromKobo(totalKobo)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        {/*
          Insufficient balance disables the row and names the shortfall rather
          than hiding the option. A missing choice reads as a broken app; a
          disabled one with a reason teaches what to do next.
        */}
        <button
          type="button"
          disabled={!walletCovers || isSubmitting}
          onClick={() => onSelectMethod("wallet")}
          className="border-input-border hover:border-input-border-focus flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Wallet className="text-heading size-5 shrink-0" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="text-heading font-syne font-medium">
              {pendingMethod === "wallet" ? "Paying..." : "Pay from wallet"}
            </span>
            <span className="text-body text-sm">
              {walletCovers
                ? `Balance ${formatFromKobo(walletBalanceKobo)}`
                : `Short by ${formatFromKobo(shortfallKobo)}. Balance ${formatFromKobo(walletBalanceKobo)}.`}
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onSelectMethod("paystack")}
          className="border-input-border hover:border-input-border-focus flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard
            className="text-heading size-5 shrink-0"
            aria-hidden="true"
          />
          <span className="flex flex-col">
            <span className="text-heading font-syne font-medium">
              {pendingMethod === "paystack"
                ? "Opening Paystack..."
                : "Pay with card or transfer"}
            </span>
            <span className="text-body text-sm">
              Secured by Paystack. You will be taken there to finish.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
