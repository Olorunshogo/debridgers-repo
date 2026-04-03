import React from "react";

interface EmailInputProps {
  label: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  errorMessage?: string;
  name?: string;
  id?: string;
}

export function EmailInput({
  label,
  placeholder,
  required,
  value,
  onChange,
  error,
  errorMessage,
  name,
  id,
}: EmailInputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="gap-sm flex flex-col">
      <label
        htmlFor={inputId}
        className="font-inter text-[14px] font-medium text-[#0F172A]"
      >
        {label}
        {required && <span className="text-error-red ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        name={name ?? inputId}
        type="email"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className="font-inter h-13 w-full rounded-3xl border p-6 text-base transition-all duration-300 ease-in-out outline-none placeholder:text-[#94A3B8]"
        style={{
          borderColor: error ? "var(--input-error-red)" : "var(--input-border)",
          backgroundColor: "var(--input-bg)",
          color: "var(--text-colour)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--input-error-red)"
            : "var(--input-border-focus)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--input-error-red)"
            : "var(--input-border)";
        }}
      />
      {error && errorMessage && (
        <p className="text-xs" style={{ color: "var(--input-error-red)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
