import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

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
      <div className={`font-syne flex flex-col gap-1.5 ${className}`}>
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
          style={{ color: "var(--heading-colour)" }}
        >
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            name={name ?? inputId}
            className="h-11 w-full appearance-none rounded-full border px-4 pr-10 text-sm transition-all duration-200 outline-none"
            style={{
              borderColor: error
                ? "var(--input-error-red)"
                : "var(--input-border)",
              backgroundColor: "var(--input-bg)",
              color: "var(--heading-colour)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error
                ? "var(--input-error-red)"
                : "var(--input-border-focus)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error
                ? "var(--input-error-red)"
                : "var(--input-border)";
            }}
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
        {error && (
          <p className="text-xs" style={{ color: "var(--input-error-red)" }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

DashSelectInput.displayName = "DashSelectInput";
