import React, { forwardRef } from "react";
import {
  BaseInputField,
  BASE_INPUT_CLASS,
  getInputStateClass,
} from "./base-input-field";

interface NumberInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const NumberInputField = forwardRef<
  HTMLInputElement,
  NumberInputFieldProps
>(
  (
    { label, error, id, name, required = false, className = "", ...props },
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
      >
        <input
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          type="number"
          className={`${BASE_INPUT_CLASS} ${getInputStateClass(error)}`}
          {...props}
        />
      </BaseInputField>
    );
  },
);

NumberInputField.displayName = "NumberInputField";
