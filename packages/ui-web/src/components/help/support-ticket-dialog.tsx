import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { TextInputField } from "../text-input-field";
import { EmailInputField } from "../email-input-field";
import { TextareaField } from "../textarea-field";
import { SubmitButton } from "../submit-button";
import {
  supportTicketSchema,
  type SupportTicketValues,
} from "../../schemas/support/ticket";

export type { SupportTicketValues };

/*
 * `defaultName` and `defaultEmail` are pre-filled from the signed-in profile so the buyer retypes nothing.
 * `contextNote` is appended to the message so support opens the ticket with the context.
 * `serverFieldErrors` is whatever the backend attributed to a specific field on the last submit (from `useDialogSubmission`'s `fieldErrors`), shown alongside this component's own client-side validation.
 */
export interface SupportTicketDialogProps {
  defaultName?: string;
  defaultEmail?: string;
  contextNote?: string;
  isSubmitting: boolean;
  error?: string | null;
  serverFieldErrors?: Partial<Record<keyof SupportTicketValues, string>>;
  success: boolean;
  onClose: () => void;
  onSubmit: (values: SupportTicketValues) => void;
}

export function SupportTicketDialog({
  defaultName = "",
  defaultEmail = "",
  contextNote,
  isSubmitting,
  error,
  serverFieldErrors,
  success,
  onClose,
  onSubmit,
}: SupportTicketDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupportTicketValues>({
    resolver: zodResolver(supportTicketSchema),
    mode: "onChange",
    defaultValues: { fullName: defaultName, email: defaultEmail, message: "" },
  });

  if (success) {
    return (
      <DialogSuccessPanel
        title="Message sent"
        description="Our support team has your message and will reply by email."
      />
    );
  }

  const submit = handleSubmit((values) =>
    onSubmit({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      message: contextNote
        ? `${values.message.trim()}\n\n${contextNote}`
        : values.message.trim(),
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader
        title="Contact support"
        description="Tell us what went wrong and we will reply by email."
        showCloser={!isSubmitting}
        onClose={onClose}
      />

      <DialogErrorBanner message={error} />

      <TextInputField
        label="Your name"
        required
        error={errors.fullName?.message ?? serverFieldErrors?.fullName}
        {...register("fullName")}
      />

      {/*
        Locked when the session supplied it. The reply goes to the account's
        address whatever is typed here, so an editable box would be inviting the
        buyer to enter an address we are not going to write to.
      */}
      <EmailInputField
        label="Email"
        required
        readOnly={Boolean(defaultEmail)}
        aria-describedby={defaultEmail ? "support-email-hint" : undefined}
        error={errors.email?.message ?? serverFieldErrors?.email}
        {...register("email")}
      />
      {defaultEmail && (
        <p id="support-email-hint" className="text-body -mt-2 text-xs">
          We will reply to this address, taken from your account.
        </p>
      )}

      <TextareaField
        label="How can we help?"
        required
        rows={5}
        placeholder="Include your order number if your question is about an order."
        error={errors.message?.message ?? serverFieldErrors?.message}
        {...register("message")}
      />

      <SubmitButton fullWidth loading={isSubmitting} loadingText="Sending...">
        Send message
      </SubmitButton>
    </form>
  );
}
