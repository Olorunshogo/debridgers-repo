import type { FieldValues, UseFormReturn } from "react-hook-form";
import { AuthField, type AuthFieldDescriptor } from "./auth-field";
import { SubmitButton } from "../submit-button";

/*
 * The generic single-step auth form: a field list, an optional slot under the
 * fields (a "Forgot password?" link, a resend action), and a submit button.
 *
 * Used for login, forgot-password, and reset-password - they differ only in
 * their field list and copy, so they share one component rather than three
 * near-identical ones. Returns the form only; no page chrome, no routing.
 */

export interface AuthCredentialsFormProps<T extends FieldValues> {
  fields: readonly AuthFieldDescriptor[];
  form: UseFormReturn<T>;
  onSubmit: (event?: React.BaseSyntheticEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  /** Rendered between the fields and the submit button. */
  footer?: React.ReactNode;
}

export function AuthCredentialsForm<T extends FieldValues>({
  fields,
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  footer,
}: AuthCredentialsFormProps<T>) {
  const { register, control, formState } = form;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {fields.map((field) => (
        <AuthField<T>
          key={field.name}
          field={field}
          register={register}
          errors={formState.errors}
          control={control}
        />
      ))}

      {footer}

      <SubmitButton
        loading={isSubmitting}
        loadingText={submittingLabel}
        className="mt-4 rounded-full"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
