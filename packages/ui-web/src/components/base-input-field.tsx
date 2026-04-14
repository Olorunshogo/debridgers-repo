import React from "react";

export interface BaseInputFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  inputId: string;
  children: React.ReactNode;
}

/**
 * Shared wrapper for all dash input fields.
 * Provides uniform label, optional tag, and error display.
 * Every DashXxxInput uses this as its outer shell.
 */
export function BaseInputField({
  label,
  error,
  required = false,
  className = "",
  inputId,
  children,
}: BaseInputFieldProps) {
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
      {children}
      {error && (
        <p className="text-xs" style={{ color: "var(--input-error-red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared inline styles for the actual input/select/textarea element */
export function getInputStyles(error?: string): React.CSSProperties {
  return {
    borderColor: error ? "var(--input-error-red)" : "var(--input-border)",
    backgroundColor: "var(--input-bg)",
    color: "var(--heading-colour)",
  };
}

/** Shared focus/blur handlers for input elements */
export function getInputFocusHandlers(error?: string) {
  return {
    onFocus: (
      e: React.FocusEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      e.currentTarget.style.borderColor = error
        ? "var(--input-error-red)"
        : "var(--input-border-focus)";
    },
    onBlur: (
      e: React.FocusEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      e.currentTarget.style.borderColor = error
        ? "var(--input-error-red)"
        : "var(--input-border)";
    },
  };
}

/** Shared className for input/select elements */
export const BASE_INPUT_CLASS =
  "placeholder:text-text-placeholder font-syne h-11 w-full cursor-pointer rounded-full border px-4 text-sm transition-all duration-300 ease-in-out outline-none focus-within:cursor-text";
