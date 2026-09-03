"use client";

import type { ReactNode } from "react";

/*
 * One boolean control, two appearances.
 *
 * A switch and a consent checkbox were separate components that both toggled a
 * boolean, both needed a label, a description and an error, and both got the
 * accessible naming subtly different. They are one component with a variant, so
 * a fix to the label wiring lands on both.
 *
 * The variants are not interchangeable in practice and should not be chosen by
 * taste: a switch takes effect immediately and belongs on a settings row, a
 * checkbox states an intent that a submit will act on and belongs in a form.
 */

// === Types

export type ToggleVariant = "switch" | "checkbox";

export interface ToggleFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: ToggleVariant;
  label?: string;
  description?: string;
  id?: string;
  /*
   * A rendered label, where the plain string cannot carry what is needed: a
   * consent tick has to link to the document being consented to, and that link
   * must be reachable before ticking. `label` remains the accessible name.
   */
  labelContent?: ReactNode;
  error?: string;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
}

// === Component

export function ToggleField({
  checked,
  onCheckedChange,
  variant = "switch",
  label,
  description,
  id,
  labelContent,
  error,
  disabled = false,
  name,
  onBlur,
}: ToggleFieldProps): React.ReactElement {
  const controlId =
    id ?? name ?? label?.toLowerCase().replace(/\s+/g, "-") ?? variant;

  if (variant === "checkbox") {
    return (
      <div className="font-syne flex flex-col gap-1">
        <label
          htmlFor={controlId}
          className="flex cursor-pointer items-start gap-3"
        >
          <input
            type="checkbox"
            id={controlId}
            name={name ?? controlId}
            checked={checked}
            disabled={disabled}
            onChange={(event) => onCheckedChange(event.target.checked)}
            onBlur={onBlur}
            aria-label={label}
            aria-invalid={error ? true : undefined}
            className="accent-primary border-line mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border disabled:cursor-not-allowed"
          />
          <span className="text-body text-sm">{labelContent ?? label}</span>
        </label>
        {description && <p className="text-body text-xs">{description}</p>}
        {error && <p className="text-input-error-red text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="font-syne flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="text-heading text-sm font-medium">{label}</span>
            )}
            {description && (
              <span className="text-body text-xs">{description}</span>
            )}
          </div>
        )}
        <button
          type="button"
          role="switch"
          id={controlId}
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          onBlur={onBlur}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-primary" : "bg-border-gray"}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5.5" : "translate-x-1"}`}
          />
        </button>
      </div>
      {error && <p className="text-input-error-red text-xs">{error}</p>}
    </div>
  );
}
