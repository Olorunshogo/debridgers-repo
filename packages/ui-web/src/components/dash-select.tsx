import React, { forwardRef, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface DashSelectProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  label: string;
  options: Option[];
  value?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export const DashSelect = forwardRef<HTMLDivElement, DashSelectProps>(
  (
    {
      label,
      options,
      value,
      placeholder = "Select an option",
      error,
      required = false,
      onChange,
      className = "",
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Find the label for the current value
    useEffect(() => {
      const selectedOption = options.find((opt) => opt.value === value);
      setSelectedLabel(selectedOption ? selectedOption.label : "");
    }, [value, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: Option) => {
      onChange?.(option.value);
      setIsOpen(false);
    };

    const toggleDropdown = () => {
      setIsOpen((prev) => !prev);
    };

    const currentDisplay = selectedLabel || placeholder;

    return (
      <div ref={containerRef} className={`font-syne relative ${className}`}>
        {/* Trigger - styled like DashTextInput */}
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-1">
            <span className="text-heading font-medium">{label}</span>
            {!required && (
              <span className="font-open-sans text-text text-sm">
                (optional)
              </span>
            )}
          </label>

          <div
            onClick={toggleDropdown}
            className={`flex h-11 w-full cursor-pointer items-center rounded-full border px-4 text-sm transition-all duration-300 ease-in-out outline-none ${error ? "border-[var(--input-error-red)]" : "border-[var(--input-border)]"} ${isOpen ? "border-[var(--input-border-focus)]" : ""} hover:border-[var(--input-border-focus)]`}
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--heading-colour)",
            }}
          >
            <span className="flex-1 truncate">{currentDisplay}</span>

            <ChevronDown
              size={18}
              className={`text-text ml-2 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>

          {error && <p className="text-input-error-red text-xs">{error}</p>}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-auto rounded-2xl border bg-white py-2 shadow-lg"
            style={{
              borderColor: "var(--input-border)",
              backgroundColor: "var(--input-bg)",
            }}
          >
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`cursor-pointer px-4 py-3 text-sm transition-colors hover:bg-gray-100 ${value === option.value ? "bg-gray-50 font-medium" : ""} `}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="text-text px-4 py-3 text-sm">
                No options available
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

DashSelect.displayName = "DashSelect";
