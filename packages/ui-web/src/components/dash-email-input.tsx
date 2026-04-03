import React, { forwardRef } from "react";

interface DashEmailInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const DashEmailInput = forwardRef<HTMLInputElement, DashEmailInputProps>(
  ({ label, error, id, name, className = "", ...props }, ref) => {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
          style={{ color: "var(--heading-colour)" }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          type="email"
          className="placeholder:text-text-placeholder h-11 w-full rounded-full border px-4 text-sm transition-all duration-200 outline-none"
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
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--input-error-red)" }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

DashEmailInput.displayName = "DashEmailInput";
