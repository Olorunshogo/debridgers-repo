import { useState } from "react";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { TextInputField } from "../text-input-field";
import { EmailInputField } from "../email-input-field";
import { TextareaField } from "../textarea-field";
import { SubmitButton } from "../submit-button";

// === Types

export interface SupportTicketValues {
  fullName: string;
  email: string;
  message: string;
}

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

type FieldErrors = Partial<Record<keyof SupportTicketValues, string>>;

// === Validation

/* Mirrors createContactSchema on the backend, so a valid form is never rejected. */
function validate(values: SupportTicketValues): FieldErrors {
  const errors: FieldErrors = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  const words = values.message.trim().split(/\s+/).filter(Boolean).length;
  if (words < 5) {
    errors.message = "Please describe the problem in at least 5 words.";
  } else if (values.message.length > 1000) {
    errors.message = "Message cannot exceed 1000 characters.";
  }

  return errors;
}

// === Component

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
  const [values, setValues] = useState<SupportTicketValues>({
    fullName: defaultName,
    email: defaultEmail,
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  if (success) {
    return (
      <DialogSuccessPanel
        title="Message sent"
        description="Our support team has your message and will reply by email."
      />
    );
  }

  function handleChange(field: keyof SupportTicketValues) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): void => {
      const next = e.target.value;
      setValues((prev) => ({ ...prev, [field]: next }));
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSubmit({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      message: contextNote
        ? `${values.message.trim()}\n\n${contextNote}`
        : values.message.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader
        title="Contact support"
        description="Tell us what went wrong and we will reply by email."
        showCloser={!isSubmitting}
        onClose={onClose}
      />

      <DialogErrorBanner message={error} />

      <TextInputField
        label="Your name"
        name="fullName"
        required
        value={values.fullName}
        onChange={handleChange("fullName")}
        error={fieldErrors.fullName ?? serverFieldErrors?.fullName}
      />

      {/*
        Locked when the session supplied it. The reply goes to the account's
        address whatever is typed here, so an editable box would be inviting the
        buyer to enter an address we are not going to write to.
      */}
      <EmailInputField
        label="Email"
        name="email"
        required
        readOnly={Boolean(defaultEmail)}
        aria-describedby={defaultEmail ? "support-email-hint" : undefined}
        value={values.email}
        onChange={handleChange("email")}
        error={fieldErrors.email ?? serverFieldErrors?.email}
      />
      {defaultEmail && (
        <p id="support-email-hint" className="text-body -mt-2 text-xs">
          We will reply to this address, taken from your account.
        </p>
      )}

      <TextareaField
        label="How can we help?"
        name="message"
        required
        rows={5}
        placeholder="Include your order number if your question is about an order."
        value={values.message}
        onChange={handleChange("message")}
        error={fieldErrors.message ?? serverFieldErrors?.message}
      />

      <SubmitButton fullWidth loading={isSubmitting} loadingText="Sending...">
        Send message
      </SubmitButton>
    </form>
  );
}
