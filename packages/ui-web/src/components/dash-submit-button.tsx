import React from "react";
import { Loader2, type LucideIcon } from "lucide-react";

// === Types

export type DashSubmitButtonVariant = "primary" | "secondary" | "tertiary";

export interface DashSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DashSubmitButtonVariant;
  loading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

// === Styles

const base =
  "font-syne inline-flex items-center justify-center gap-2 rounded-full text-sm transition-all duration-300 ease-in-out cursor-default hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<DashSubmitButtonVariant, string> = {
  primary: "bg-primary px-6 py-3 font-semibold text-white hover:opacity-90",
  secondary:
    "border-line text-heading border bg-white px-4 py-2 font-medium hover:bg-black/5",
  tertiary:
    "bg-secondary text-heading px-5 py-2.5 font-semibold hover:opacity-90",
};

export function DashSubmitButton({
  variant = "primary",
  loading = false,
  loadingText = "Submitting...",
  icon: Icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: DashSubmitButtonProps) {
  return (
    <button
      // Set before the spread so a caller passing type="button" still wins,
      // which the modal triggers rely on.
      type="submit"
      disabled={loading || disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
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
