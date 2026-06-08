import React, { forwardRef } from "react";
import {
  BaseInputField,
  BASE_INPUT_CLASS,
  getInputStyles,
  getInputFocusHandlers,
} from "./base-input-field";

interface DashTextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const DashTextInput = forwardRef<HTMLInputElement, DashTextInputProps>(
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
          type="text"
          className={BASE_INPUT_CLASS}
          style={getInputStyles(error)}
          {...getInputFocusHandlers(error)}
          {...props}
        />
      </BaseInputField>
    );
  },
);

DashTextInput.displayName = "DashTextInput";
