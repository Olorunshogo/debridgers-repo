import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DialogHeader,
  DialogErrorBanner,
  NumberInputField,
  useDialog,
  useDialogSubmission,
} from "@debridgers/ui-web";

/*
 * Sets a manual delivery fee on an awaiting_quote order, registered as
 * SET_DELIVERY_QUOTE. The buyer typed naira; the backend wants kobo, so the
 * conversion happens once, here, at the boundary.
 */

interface SetDeliveryQuoteDialogProps {
  orderReference?: string;
  onSubmit?: (deliveryFeeKobo: number) => void | Promise<void>;
}

export default function SetDeliveryQuoteDialog({
  orderReference = "this order",
  onSubmit,
}: SetDeliveryQuoteDialogProps) {
  const { closeDialog } = useDialog();
  const { error, run, isSubmitting } = useDialogSubmission<boolean>();
  const [naira, setNaira] = useState<string>("");

  const parsedNaira = Number(naira);
  const isValid =
    naira.trim() !== "" && Number.isFinite(parsedNaira) && parsedNaira >= 0;

  async function handleSubmit(): Promise<void> {
    if (!isValid) return;
    const succeeded = await run(async () => {
      await onSubmit?.(Math.round(parsedNaira * 100));
      return true;
    });
    if (succeeded) closeDialog();
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Set delivery fee"
        description={`${orderReference} is outside our priced zones. Set what delivery actually costs, and the buyer will be notified to pay.`}
        showCloser={!isSubmitting}
        onClose={closeDialog}
      />

      <DialogErrorBanner message={error} />

      <NumberInputField
        label="Delivery fee (₦)"
        id="delivery-quote-naira"
        min={0}
        step={1}
        value={naira}
        onChange={(event) => setNaira(event.target.value)}
        placeholder="e.g. 12000"
      />

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
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || !isValid}
          className="bg-primary inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          Set fee & notify buyer
        </button>
      </div>
    </div>
  );
}
