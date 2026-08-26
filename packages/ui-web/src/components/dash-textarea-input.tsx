import React, { forwardRef } from "react";
import { BaseInputField, getInputStateClass } from "./base-input-field";

interface DashTextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
  maxWords?: number;
  resizable?: boolean;
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export const DashTextareaInput = forwardRef<
  HTMLTextAreaElement,
  DashTextareaInputProps
>(
  (
    {
      label,
      error,
      id,
      name,
      required = false,
      className = "",
      maxWords = 300,
      resizable = false,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
    const currentWords = countWords(String(value ?? ""));
    const atMax = currentWords >= maxWords;

    // Derive the error to show: max-words error takes priority over passed error
    const displayError = atMax
      ? `Maximum word count reached (${maxWords} words)`
      : error;

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      if (!onChange) return;
      const words = countWords(e.target.value);
      if (words > maxWords) {
        // Trim to maxWords
        const trimmed = e.target.value
          .trim()
          .split(/\s+/)
          .slice(0, maxWords)
          .join(" ");
        // Mutate the synthetic event value
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        nativeInputValueSetter?.call(e.target, trimmed);
        e.target.dispatchEvent(new Event("input", { bubbles: true }));
        onChange({ ...e, target: { ...e.target, value: trimmed } });
        return;
      }
      onChange(e);
    }

    return (
      <BaseInputField
        label={label}
        error={displayError}
        required={required}
        className={className}
        inputId={inputId}
      >
        <textarea
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          rows={4}
          className={`placeholder:text-placeholder-text bg-input-bg text-heading font-syne min-h-25 w-full rounded-2xl border px-4 py-3 text-sm transition-all duration-300 ease-in-out outline-none ${resizable ? "resize-y" : "resize-none"} ${getInputStateClass(displayError)}`}
          value={value}
          onChange={handleChange}
          {...props}
        />
        {/* Live word count */}
        <p
          className={`flex justify-end text-xs ${atMax ? "text-input-error-red" : "text-body"}`}
        >
          {currentWords}/{maxWords}
        </p>
      </BaseInputField>
    );
  },
);

DashTextareaInput.displayName = "DashTextareaInput";
