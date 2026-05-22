import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function SecondaryButton({
  loading = false,
  loadingText = "Submitting...",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      className={`font-syne text-primary inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-6 py-3 text-sm font-semibold transition-all duration-300 ease-in-out hover:border-gray-400 hover:bg-gray-50 focus:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
      {...props}
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
