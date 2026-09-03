import React from "react";
import { Loader2, type LucideIcon } from "lucide-react";

/*
 * The one submit button.
 *
 * There were two, identical in behaviour and different in shape, and a caller
 * picked whichever it happened to import. They are merged here rather than kept
 * in step, because keeping two in step is what failed.
 *
 * The variants are not decoration. "block" is the auth and marketing form
 * button, full width with a square-ish radius, and it is the shape a long form
 * ends on. The other three are the dashboard pill. Both looks are preserved
 * exactly as they were, so this merge changes no pixels.
 */

// === Types

export type SubmitButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "block";

export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SubmitButtonVariant;
  loading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  /** Ignored by "block", which is always full width. */
  fullWidth?: boolean;
}

// === Styles

const BASE =
  "font-syne inline-flex items-center justify-center gap-2 text-sm transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<SubmitButtonVariant, string> = {
  primary:
    "rounded-full cursor-default hover:cursor-pointer bg-primary px-6 py-3 font-semibold text-white hover:opacity-90",
  secondary:
    "rounded-full cursor-default hover:cursor-pointer border-line text-heading border bg-white px-4 py-2 font-medium hover:bg-black/5",
  tertiary:
    "rounded-full cursor-default hover:cursor-pointer bg-secondary text-heading px-5 py-2.5 font-semibold hover:opacity-90",
  /*
   * The scale-on-hover and focus:scale-95 are deliberate here and absent from
   * the pill variants. A form's final button is the one place the feedback is
   * worth the motion; a toolbar of them jittering is not.
   */
  block:
    "flex w-full cursor-pointer rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:scale-102 hover:opacity-95 focus:scale-95",
};

// === Component

export function SubmitButton({
  variant = "primary",
  loading = false,
  loadingText = "Submitting...",
  icon: Icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const widthClass = variant !== "block" && fullWidth ? "w-full" : "";

  return (
    <button
      // Set before the spread so a caller passing type="button" still wins,
      // which the modal triggers rely on.
      type="submit"
      disabled={loading || disabled}
      className={`${BASE} ${VARIANTS[variant]} ${widthClass} ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {Icon && <Icon className="h-4 w-4" />}
          {children}
        </>
      )}
    </button>
  );
}
