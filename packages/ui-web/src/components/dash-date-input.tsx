import React, { forwardRef } from "react";
import {
  BaseInputField,
  BASE_INPUT_CLASS,
  getInputStyles,
  getInputFocusHandlers,
} from "./base-input-field";

interface DashDateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

/** Returns today's date as YYYY-MM-DD for use as a default value */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]!;
}

export const DashDateInput = forwardRef<HTMLInputElement, DashDateInputProps>(
  (
    {
      label,
      error,
      id,
      name,
      required = false,
      className = "",
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
    // Default to today if no value/defaultValue provided
    const resolvedDefault =
      value !== undefined ? undefined : (defaultValue ?? getTodayDateString());

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
          type="date"
          className={`${BASE_INPUT_CLASS} pr-4`}
          style={getInputStyles(error)}
          {...getInputFocusHandlers(error)}
          value={value}
          defaultValue={resolvedDefault}
          {...props}
        />
      </BaseInputField>
    );
  },
);

DashDateInput.displayName = "DashDateInput";
