import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

/*
 * Extends div attributes, not input attributes: this renders a button-and-list
 * combobox, so an input's props were never spreadable onto anything here.
 */
interface SelectFieldProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
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

export const SelectField = forwardRef<HTMLDivElement, SelectFieldProps>(
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
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectedLabel, setSelectedLabel] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);

    /* The outside-click guard needs the node, and so does the caller. Both get
       it: the forwarded ref used to be declared and then dropped. */
    const setRefs = useCallback(
      (node: HTMLDivElement | null): void => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

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
      <div
        ref={setRefs}
        className={`font-syne relative ${className}`}
        {...props}
      >
        {/* Trigger - styled like TextInputField */}
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-1">
            <span className="text-heading font-medium">{label}</span>
            {required && (
              <span className="text-error-red ml-0.5" aria-hidden="true">
                *
              </span>
            )}
            {!required && (
              <span className="font-open-sans text-body text-sm">
                (optional)
              </span>
            )}
          </label>

          <div
            onClick={toggleDropdown}
            className={`bg-input-bg text-heading hover:border-input-border-focus flex h-11 w-full cursor-pointer items-center rounded-full border px-4 text-sm transition-all duration-300 ease-in-out outline-none ${
              error
                ? "border-input-error-red"
                : isOpen
                  ? "border-input-border-focus"
                  : "border-input-border"
            }`}
          >
            <span className="flex-1 truncate">{currentDisplay}</span>

            <ChevronDown
              size={18}
              className={`text-body ml-2 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>

          {error && <p className="text-input-error-red text-xs">{error}</p>}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="border-input-border bg-input-bg absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-auto rounded-2xl border py-2 shadow-lg">
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
              <div className="text-body px-4 py-3 text-sm">
                No options available
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";
