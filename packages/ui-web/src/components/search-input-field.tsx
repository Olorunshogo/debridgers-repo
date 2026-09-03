import React, { forwardRef } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";

interface SearchInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilterClick?: () => void;
  loading?: boolean;
}

export const SearchInputField = forwardRef<
  HTMLInputElement,
  SearchInputFieldProps
>(({ className = "", onFilterClick, loading = false, ...props }, ref) => {
  return (
    <div
      className={`border-line bg-input-bg focus-within:border-primary focus-within:ring-primary/30 font-syne flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-300 ease-in-out focus-within:ring-1 ${className}`}
    >
      {loading ? (
        <Loader2
          size={16}
          className="text-icon-secondary shrink-0 animate-spin"
        />
      ) : (
        <Search size={16} className="text-icon-secondary shrink-0" />
      )}
      <input
        ref={ref}
        type="search"
        className="placeholder:text-placeholder-text text-heading w-full bg-transparent text-sm outline-none"
        {...props}
      />
      <button
        type="button"
        aria-label="Filter"
        onClick={onFilterClick}
        className="text-icon-secondary shrink-0 transition-all duration-300 ease-in-out"
      >
        <SlidersHorizontal size={16} />
      </button>
    </div>
  );
});

SearchInputField.displayName = "SearchInputField";
