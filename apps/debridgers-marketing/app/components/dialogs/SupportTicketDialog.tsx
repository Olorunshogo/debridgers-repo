import { useEffect } from "react";
import {
  SupportTicketDialog as SupportTicketDialogView,
  useDialog,
  useDialogSubmission,
  DIALOG_SUCCESS_CLOSE_DELAY_MS,
  type SupportTicketValues,
} from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "@debridgers/api-client";

/*
 * Glue between the dialog engine and the contact endpoint.
 * Posts to the same /contact endpoint the marketing page form uses, so a message raised from inside a dashboard lands in the same inbox as a public enquiry.
 * Registered as SUPPORT_TICKET in app/providers/dialog-registry.ts.
 * contextNote is appended to the message, e.g. the order the user is asking about.
 */

interface SupportTicketDialogProps {
  defaultName?: string;
  defaultEmail?: string;
  contextNote?: string;
}

export default function SupportTicketDialog({
  defaultName,
  defaultEmail,
  contextNote,
}: SupportTicketDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const { status, error, run, isSubmitting } = useDialogSubmission<void>();

  /* A half-sent message is not something to let someone click away from. */
  useEffect(() => {
    setDialogLoading(isSubmitting);
  }, [isSubmitting, setDialogLoading]);

  useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(closeDialog, DIALOG_SUCCESS_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, closeDialog]);

  /*
   * Deliberately not apiFetch: /contact is public and unauthenticated.
   * A support message must still send when the session is the thing that broke.
   */
  async function submit(values: SupportTicketValues): Promise<void> {
    const res = await fetch(`${BASE_BACKEND_URL}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: values.fullName,
        email: values.email,
        message: values.message,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { message?: string })?.message ??
          "Could not send your message. Please try again.",
      );
    }
  }

  return (
    <SupportTicketDialogView
      defaultName={defaultName}
      defaultEmail={defaultEmail}
      contextNote={contextNote}
      isSubmitting={isSubmitting}
      error={error}
      success={status === "success"}
      onClose={closeDialog}
      onSubmit={(values) => run(() => submit(values))}
    />
  );
}
