import React from "react";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SubmitButton({
  loading = false,
  loadingText = "Submitting...",
  children,
  className,
  disabled,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`px-lg inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
