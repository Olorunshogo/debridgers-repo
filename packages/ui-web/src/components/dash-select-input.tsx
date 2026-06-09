import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { BaseInputField } from "./base-input-field";

interface SelectOption {
  value: string;
  label: string;
}

interface DashSelectInputProps {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DashSelectInput({
  label,
  options,
  placeholder,
  error,
  value,
  defaultValue,
  onChange,
  id,
  name,
  className = "",
  required,
  disabled,
}: DashSelectInputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
  const isControlled = value !== undefined;

  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? "",
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const currentValue = isControlled ? value : internalValue;
  const selectedLabel =
    options.find((o) => o.value === currentValue)?.label ?? null;

  // === Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelect = useCallback(
    (optValue: string) => {
      if (!isControlled) setInternalValue(optValue);
      setIsOpen(false);

      if (onChange) {
        // === Synthesise a ChangeEvent<HTMLSelectElement> so call sites need no changes
        const nativeSelect = document.createElement("select");
        nativeSelect.name = name ?? inputId;
        Object.defineProperty(nativeSelect, "value", { value: optValue });
        const syntheticEvent = {
          target: nativeSelect,
          currentTarget: nativeSelect,
          bubbles: true,
          cancelable: false,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: true,
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: new Event("change"),
          type: "change",
          timeStamp: Date.now(),
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          persist: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    },
    [isControlled, onChange, name, inputId],
  );

  return (
    <BaseInputField
      label={label}
      error={error}
      required={required}
      className={className}
      inputId={inputId}
    >
      <div ref={wrapperRef} className="relative">
        {/* Trigger */}
        <button
          type="button"
          id={inputId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => !disabled && setIsOpen((o) => !o)}
          className={`bg-input-bg text-heading font-syne flex h-11 w-full cursor-pointer items-center justify-between rounded-full border p-4 text-sm transition-all duration-300 ease-in-out outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-input-error-red"
              : isOpen
                ? "border-input-border-focus"
                : "border-input-border"
          }`}
        >
          <span
            className={`flex-1 text-left ${selectedLabel ? "text-heading" : "text-text-placeholder"}`}
          >
            {selectedLabel ?? placeholder ?? `Select ${label}`}
          </span>
          <ChevronDown
            size={16}
            className={`text-icon-secondary pointer-events-none transition-transform duration-300 ease-in-out ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            role="listbox"
            className="border-gray-border absolute top-[calc(100%+4px)] left-0 z-50 max-h-90 w-full overflow-hidden overflow-y-auto rounded-2xl border bg-white py-1 shadow-lg"
          >
            {placeholder && (
              <div className="text-text-placeholder cursor-default px-4 py-2.5 text-sm">
                {placeholder}
              </div>
            )}
            {options.map((opt) => {
              const isSelected = opt.value === currentValue;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`cursor-pointer px-4 py-2.5 text-sm transition-all duration-150 ease-in-out ${
                    isSelected
                      ? "bg-dash-quick-action-hover text-primary font-semibold"
                      : "text-heading hover:bg-bg-light font-normal"
                  }`}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BaseInputField>
  );
}

DashSelectInput.displayName = "DashSelectInput";
