import React from "react";

interface TextareaInputProps {
  label: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: boolean;
  errorMessage?: string;
  name?: string;
  id?: string;
  rows?: number;
}

export function TextareaInput({
  label,
  placeholder,
  required,
  value,
  onChange,
  error,
  errorMessage,
  name,
  id,
  rows = 5,
}: TextareaInputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="font-syne flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="font-syne text-heading text-body-sm font-medium"
      >
        {label}
        {required && <span className="text-error-red ml-0.5">*</span>}
      </label>
      <textarea
        id={inputId}
        name={name ?? inputId}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        rows={rows}
        className={`placeholder:text-text-placeholder bg-input-bg text-text font-syne w-full resize-none rounded-lg border p-6 text-base transition-all duration-300 ease-in-out outline-none ${error ? "border-input-error-red focus:border-input-error-red" : "border-input-border focus:border-input-border-focus"}`}
      />
      {error && errorMessage && (
        <p className="text-input-error-red text-xs">{errorMessage}</p>
      )}
    </div>
  );
}
