import React, { forwardRef } from "react";

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
          type="text"
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
        {error && <p className="text-input-error-red text-xs">{error}</p>}
      </div>
    );
  },
);

DashTextInput.displayName = "DashTextInput";
