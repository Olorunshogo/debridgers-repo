import React from "react";
import { Loader2 } from "lucide-react";

// interface SubmitButtonProps {
//   loading?: boolean;
//   loadingText?: string;
//   children: React.ReactNode;
//   className?: string;
//   disabled?: boolean;
// }

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function SubmitButton({
  loading = false,
  loadingText = "Submitting...",
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`px-lg font-syne bg-primary inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:scale-102 hover:opacity-95 focus:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
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
