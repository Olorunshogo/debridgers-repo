import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  DialogHeader,
  DialogErrorBanner,
  TextInputField,
  useDialog,
  useDialogSubmission,
  reasonFormSchema,
  type ReasonFormValues,
} from "@debridgers/ui-web";

/* Marking a delivery attempt failed, registered as MARK_DELIVERY_FAILED. Mirrors RejectPayoutDialog's shape. */

interface MarkDeliveryFailedDialogProps {
  orderReference?: string;
  onSubmit?: (reason: string) => void | Promise<void>;
}

export default function MarkDeliveryFailedDialog({
  orderReference = "this order",
  onSubmit,
}: MarkDeliveryFailedDialogProps) {
  const { closeDialog } = useDialog();
  const { error, run, isSubmitting } = useDialogSubmission<boolean>();
  const { register, handleSubmit: handleFormSubmit } =
    useForm<ReasonFormValues>({
      resolver: zodResolver(reasonFormSchema),
      mode: "onChange",
      defaultValues: { reason: "" },
    });

  const handleSubmit = handleFormSubmit(async (values) => {
    const succeeded = await run(async () => {
      await onSubmit?.(values.reason.trim());
      return true;
    });
    if (succeeded) closeDialog();
  });

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Mark delivery as failed?"
        description={`${orderReference} will move to delivery failed and can be sent out again or cancelled.`}
        showCloser={!isSubmitting}
        onClose={closeDialog}
      />

      <DialogErrorBanner message={error} />

      <TextInputField
        label="Reason"
        placeholder="e.g. Buyer not reachable at address"
        {...register("reason")}
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
          disabled={isSubmitting}
          className="bg-status-cancelled-fg inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          Mark failed
        </button>
      </div>
    </div>
  );
}
