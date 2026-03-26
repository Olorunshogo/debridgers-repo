import React from "react";

interface TextInputProps {
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

export function TextInput({
  label,
  placeholder,
  required,
  value,
  onChange,
  error,
  errorMessage,
  name,
  id,
}: TextInputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-(--gap-sm)">
      <label
        htmlFor={inputId}
        className="text-sm font-medium"
        style={{ color: "var(--heading-black)" }}
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={inputId}
        name={name ?? inputId}
        type="text"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border px-4 py-3 text-sm transition-colors duration-200 outline-none placeholder:text-gray-400"
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
