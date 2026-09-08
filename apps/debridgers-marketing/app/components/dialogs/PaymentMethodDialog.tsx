import { useEffect, useState } from "react";
import {
  BuyerPaymentMethodDialog,
  useDialog,
  useDialogSubmission,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
  type BuyerPaymentMethod,
} from "@debridgers/ui-web";
import { apiFetch, ApiError } from "@debridgers/api-client";

/*
 * Glue between the dialog engine and the API. Registered as PAYMENT_METHOD in
 * app/providers/dialog-registry.ts.
 *
 * Step two of checkout: the order already exists as pending and unpaid, and
 * every figure below was priced by the server when it was created. Nothing here
 * recomputes a total, so what the buyer was shown is what gets charged.
 */

/* onPaid fires only after a wallet payment settles, never for the Paystack hop. */
interface PaymentMethodDialogProps {
  orderId: number;
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
  walletBalanceKobo: number;
  onPaid?: () => void;
}

interface PayResponse {
  authorization_url?: string;
}

export default function PaymentMethodDialog({
  orderId,
  itemsTotalKobo,
  deliveryFeeKobo,
  handlingFeeKobo,
  totalKobo,
  walletBalanceKobo,
  onPaid,
}: PaymentMethodDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { status, error, run, isSubmitting } = useDialogSubmission<void>();
  const [pendingMethod, setPendingMethod] = useState<BuyerPaymentMethod | null>(
    null,
  );

  /*
   * Blocks Escape and backdrop dismissal mid-payment. Clicking away from a
   * half-submitted charge is the expensive kind of accident.
   */
  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (status !== "success") return;
    onPaid?.();
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog, onPaid]);

  useEffect(() => {
    if (status === "error") setPendingMethod(null);
  }, [status]);

  return (
    <BuyerPaymentMethodDialog
      itemsTotalKobo={itemsTotalKobo}
      deliveryFeeKobo={deliveryFeeKobo}
      handlingFeeKobo={handlingFeeKobo}
      totalKobo={totalKobo}
      walletBalanceKobo={walletBalanceKobo}
      isSubmitting={isSubmitting}
      pendingMethod={pendingMethod}
      error={error}
      success={status === "success"}
      onClose={closeDialog}
      onSelectMethod={(method) => {
        if (isSubmitting) return;
        setPendingMethod(method);

        return run(async () => {
          let res: PayResponse;
          try {
            res = await apiFetch<PayResponse>(`/buyer/orders/${orderId}/pay`, {
              method: "POST",
              body: JSON.stringify({
                payment_method: method,
                amount_kobo: totalKobo,
              }),
            });
          } catch (err) {
            /*
             * The payment rate limiter exists to stop an order being charged
             * twice, so hitting it usually means an attempt is already in
             * flight. "Too many payment attempts. Try again in 47 seconds"
             * reads as a fault; this says what actually happened.
             */
            if (err instanceof ApiError && err.status === 429) {
              throw new Error(
                "We are still processing your last attempt on this order. Give it a moment before trying again.",
              );
            }
            throw err;
          }

          /*
           * Paystack finishes off-site, so this never reaches the success
           * panel. The webhook is what actually marks the order paid; landing
           * back on the return URL is not proof of payment.
           */
          if (method === "paystack") {
            if (!res?.authorization_url) {
              throw new Error(
                "Could not start the card payment. Please try again.",
              );
            }
            window.location.href = res.authorization_url;
            /* Hold the busy state while the browser navigates away. */
            await new Promise(() => {});
          }
        });
      }}
    />
  );
}
