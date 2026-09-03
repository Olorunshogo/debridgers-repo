import React, { forwardRef } from "react";
import {
  BaseInputField,
  getInputClass,
  getInputStateClass,
  type InputVariant,
} from "./base-input-field";

interface EmailInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  /** "pill" is the marketing treatment. Defaults to the dashboard one. */
  variant?: InputVariant;
}

export const EmailInputField = forwardRef<
  HTMLInputElement,
  EmailInputFieldProps
>(
  (
    {
      label,
      error,
      id,
      name,
      required,
      className = "",
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <BaseInputField
        label={label}
        error={error}
        required={required}
        className={className}
        inputId={inputId}
        variant={variant}
      >
        <input
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          type="email"
          className={`${getInputClass(variant)} ${getInputStateClass(error)}`}
          {...props}
        />
      </BaseInputField>
    );
  },
);

EmailInputField.displayName = "EmailInputField";
