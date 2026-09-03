import React from "react";

/*
 * Which surface the field is sitting on.
 *
 * "default" is the dashboard treatment. "pill" is the larger, rounder marketing
 * treatment that the public forms have always used. It is a variant rather than
 * a second component because the behaviour is identical and only the size and
 * radius differ, and two components meant two places to fix a label bug.
 */
export type InputVariant = "default" | "pill";

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
  variant?: InputVariant;
  children: React.ReactNode;
}

/**
 * Shared wrapper for every input field in the app, dashboard and marketing
 * alike. Provides uniform label, optional tag, and error display.
 */
export function BaseInputField({
  label,
  error,
  required = false,
  className = "",
  inputId,
  hideLabel = false,
  variant = "default",
  children,
}: BaseInputFieldProps) {
  const isPill = variant === "pill";

  return (
    <div
      className={`font-syne flex flex-col ${isPill ? "gap-2" : "gap-1.5"} ${className}`}
    >
      <label
        htmlFor={inputId}
        className={
          hideLabel ? "sr-only" : "flex cursor-pointer items-center gap-1"
        }
      >
        <span
          className={`text-heading font-syne font-medium ${isPill ? "text-body-sm" : ""}`}
        >
          {label}
        </span>
        {/* aria-hidden: the input's own `required` already tells a screen
            reader, so the asterisk is decoration for sighted users. */}
        {required && !hideLabel && (
          <span className="text-error-red ml-0.5" aria-hidden="true">
            *
          </span>
        )}
        {!required && !hideLabel && (
          <span className="font-open-sans text-body text-sm">(optional)</span>
        )}
      </label>
      {children}
      {error && <p className="text-input-error-red text-xs">{error}</p>}
    </div>
  );
}

export function getInputStateClass(error?: string): string {
  return error
    ? "border-input-error-red focus:border-input-error-red"
    : "border-input-border focus:border-input-border-focus";
}

/** Shared className for input/select elements */
/*
 * read-only:* rather than a prop: any field that sets readOnly gets the muted
 * treatment and the not-allowed cursor automatically, so the affordance cannot
 * drift from the behaviour. focus:cursor-text is overridden for the same reason
 * - a read-only field still takes focus, and a caret there invites typing.
 */
export const BASE_INPUT_CLASS =
  "placeholder:text-placeholder-text bg-input-bg text-heading font-syne h-11 w-full cursor-pointer rounded-full border px-4 text-sm transition-all duration-300 ease-in-out outline-none focus:cursor-text read-only:bg-light-bg read-only:text-body read-only:cursor-not-allowed read-only:focus:cursor-not-allowed";

/*
 * The marketing treatment: taller, rounder, larger type. Kept as its own
 * constant rather than assembled from overrides so the two surfaces can be read
 * side by side and neither drifts by accident.
 */
export const PILL_INPUT_CLASS =
  "placeholder:text-placeholder-text bg-input-bg text-body font-syne h-13 w-full rounded-3xl border p-6 text-base transition-all duration-300 ease-in-out outline-none";

/** The input className for a variant, before the error state is applied. */
export function getInputClass(variant: InputVariant = "default"): string {
  return variant === "pill" ? PILL_INPUT_CLASS : BASE_INPUT_CLASS;
}
