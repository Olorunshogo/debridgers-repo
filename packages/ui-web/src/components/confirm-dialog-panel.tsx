import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { DialogHeader } from "../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../lib/dialog/dialog-error-banner";

/*
 * The confirmation body every destructive row action shares.
 *
 * The table engine's `confirm` on a row action opens a registered dialog and
 * hands it `onConfirm`. This is the presentation half of that contract: props
 * in, no fetching, no routing.
 */

export interface ConfirmDialogPanelProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  error?: string | null;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const confirmToneClasses = {
  danger: "bg-status-cancelled-fg text-white",
  primary: "bg-primary text-white",
} as const;

export function ConfirmDialogPanel({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  error,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ConfirmDialogPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title={title}
        description={description}
        showCloser={!isSubmitting}
        onClose={onCancel}
      />

      <DialogErrorBanner message={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-line text-heading hover:bg-light-bg cursor-pointer rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
            confirmToneClasses[tone],
          )}
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
