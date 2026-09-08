import {
  ConfirmDialogPanel,
  useDialog,
  useDialogSubmission,
} from "@debridgers/ui-web";

/*
 * The generic confirmation, registered as CONFIRM.
 * The table engine opens this for any row action that declares `confirm`, and passes `onConfirm` alongside the copy.
 * Nothing here knows what is being confirmed, which is the point: one dialog for every destructive row action in the app rather than a bespoke overlay per page.
 * The dialog stays open and shows the error if the action rejects, so a failed delete does not disappear silently.
 */

interface ConfirmDialogProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm?: () => void | Promise<void>;
}

export default function ConfirmDialog({
  title = "Are you sure?",
  description,
  confirmLabel,
  cancelLabel,
  tone,
  onConfirm,
}: ConfirmDialogProps) {
  const { closeDialog } = useDialog();
  /* Typed boolean rather than void so success is distinguishable: run resolves undefined when the action throws, which a void action cannot be told apart from a successful one. */
  const { error, run, isSubmitting } = useDialogSubmission<boolean>();

  async function handleConfirm(): Promise<void> {
    const succeeded = await run(async () => {
      await onConfirm?.();
      return true;
    });
    if (succeeded) closeDialog();
  }

  return (
    <ConfirmDialogPanel
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone={tone}
      error={error}
      isSubmitting={isSubmitting}
      onConfirm={() => void handleConfirm()}
      onCancel={closeDialog}
    />
  );
}
