import React, { forwardRef } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

interface DashSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilterClick?: () => void;
}

export const DashSearchInput = forwardRef<
  HTMLInputElement,
  DashSearchInputProps
>(({ className = "", onFilterClick, ...props }, ref) => {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-200 focus-within:ring-1 ${className}`}
      style={{
        borderColor: "var(--border-gray)",
        backgroundColor: "var(--input-bg)",
        // @ts-expect-error css var
        "--tw-ring-color": "var(--primary-color)",
      }}
    >
      <Search
        size={16}
        className="shrink-0"
        style={{ color: "var(--icon-secondary)" }}
      />
      <input
        ref={ref}
        type="search"
        className="placeholder:text-text-placeholder w-full bg-transparent text-sm outline-none"
        style={{ color: "var(--heading-colour)" }}
        {...props}
      />
      <button
        type="button"
        aria-label="Filter"
        onClick={onFilterClick}
        className="shrink-0 transition-colors"
        style={{ color: "var(--icon-secondary)" }}
      >
        <SlidersHorizontal size={16} />
      </button>
    </div>
  );
});

DashSearchInput.displayName = "DashSearchInput";
