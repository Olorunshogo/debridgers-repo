import { useEffect } from "react";
import {
  RatingSheet,
  useDialog,
  useRatingSubmissionService,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
  type RatingContextKey,
} from "@debridgers/ui-web";

/*
 * Glue between the dialog engine and the API.
 * The presentation component in @debridgers/ui-web knows nothing about fetching or routing; useRatingSubmissionService is the shared piece that talks to /ratings, so every app's glue looks the same.
 * Registered as RATE_ORDER in app/providers/dialog-registry.ts.
 */

/* `onRated` lets the deliveries page drop this entry from its pending list once submitted. */
interface RateOrderDialogProps {
  contextKey: RatingContextKey;
  orderId: number;
  subjectLabel?: string;
  onRated?: () => void;
}

export default function RateOrderDialog({
  contextKey,
  orderId,
  subjectLabel,
  onRated,
}: RateOrderDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { submit, status, error, isSubmitting } = useRatingSubmissionService(
    contextKey,
    orderId,
  );

  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (status !== "success") return;
    onRated?.();
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog, onRated]);

  return (
    <RatingSheet
      contextKey={contextKey}
      subjectLabel={subjectLabel}
      isSubmitting={isSubmitting}
      error={error}
      success={status === "success"}
      onClose={closeDialog}
      onSubmitRating={submit}
    />
  );
}
