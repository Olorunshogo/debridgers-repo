import React, { forwardRef } from "react";

interface DashEmailInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const DashEmailInput = forwardRef<HTMLInputElement, DashEmailInputProps>(
  ({ label, error, id, name, required, className = "", ...props }, ref) => {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={`font-syne flex flex-col gap-1.5 ${className}`}>
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-1"
        >
          <span className="text-heading font-syne font-medium">{label}</span>
          {!required && (
            <span className="font-open-sans text-text text-sm">(optional)</span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          type="email"
          className="placeholder:text-text-placeholder font-syne h-11 w-full cursor-pointer rounded-full border px-4 text-sm transition-all duration-300 ease-in-out outline-none focus-within:cursor-text"
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
