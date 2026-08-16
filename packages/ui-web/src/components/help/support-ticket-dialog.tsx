import { useState } from "react";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { DashTextInput } from "../dash-text-input";
import { DashEmailInput } from "../dash-email-input";
import { DashTextareaInput } from "../dash-textarea-input";
import { DashSubmitButton } from "../dash-submit-button";

// === Types

export interface SupportTicketValues {
  fullName: string;
  email: string;
  message: string;
}

export interface SupportTicketDialogProps {
  /* Pre-filled from the signed-in profile so the buyer retypes nothing. */
  defaultName?: string;
  defaultEmail?: string;
  /* Appended to the message so support opens the ticket with the context. */
  contextNote?: string;
  isSubmitting: boolean;
  error?: string | null;
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

      <DashTextInput
        label="Your name"
        name="fullName"
        required
        value={values.fullName}
        onChange={handleChange("fullName")}
        error={fieldErrors.fullName}
      />

      <DashEmailInput
        label="Email"
        name="email"
        required
        value={values.email}
        onChange={handleChange("email")}
        error={fieldErrors.email}
      />

      <DashTextareaInput
        label="How can we help?"
        name="message"
        required
        rows={5}
        placeholder="Include your order number if your question is about an order."
        value={values.message}
        onChange={handleChange("message")}
        error={fieldErrors.message}
      />

      <DashSubmitButton
        fullWidth
        loading={isSubmitting}
        loadingText="Sending..."
      >
        Send message
      </DashSubmitButton>
    </form>
  );
}
