import React from "react";

export interface BaseInputFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  inputId: string;
  /*
   * Hides the visible label without removing it from the accessibility tree.
   *
   * For compact contexts like a filter bar, where a stacked label would break
   * the row and the control's purpose is already obvious from its placeholder.
   * The label stays required so it can never be dropped entirely.
   */
  hideLabel?: boolean;
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
  hideLabel = false,
  children,
}: BaseInputFieldProps) {
  return (
    <div className={`font-syne flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className={
          hideLabel ? "sr-only" : "flex cursor-pointer items-center gap-1"
        }
      >
        <span className="text-heading font-syne font-medium">{label}</span>
        {!required && !hideLabel && (
          <span className="font-open-sans text-text text-sm">(optional)</span>
        )}
      </label>
      {children}
      {error && <p className="text-input-error-red text-xs">{error}</p>}
    </div>
  );
}

export function getInputStateClass(error?: string): string {
  return error
    ? "border-input-error-red"
    : "border-input-border focus:border-input-border-focus";
}

/** Shared className for input/select elements */
export const BASE_INPUT_CLASS =
  "placeholder:text-text-placeholder bg-input-bg text-heading font-syne h-11 w-full cursor-pointer rounded-full border px-4 text-sm transition-all duration-300 ease-in-out outline-none focus:cursor-text";
