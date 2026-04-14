import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  BaseInputField,
  getInputStyles,
  getInputFocusHandlers,
} from "./base-input-field";

interface SelectOption {
  value: string;
  label: string;
}

interface DashSelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const DashSelectInput = forwardRef<
  HTMLSelectElement,
  DashSelectInputProps
>(
  (
    { label, options, placeholder, error, id, name, className = "", ...props },
    ref,
  ) => {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <BaseInputField
        label={label}
        error={error}
        className={className}
        inputId={inputId}
      >
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            name={name ?? inputId}
            className="h-11 w-full appearance-none rounded-full border px-4 pr-10 text-sm transition-all duration-200 outline-none"
            style={getInputStyles(error)}
            {...getInputFocusHandlers(error)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="text-icon-secondary pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
          />
        </div>
      </BaseInputField>
    );
  },
);

DashSelectInput.displayName = "DashSelectInput";
