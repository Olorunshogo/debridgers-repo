"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface DashPasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const DashPasswordInput = forwardRef<
  HTMLInputElement,
  DashPasswordInputProps
>(({ label, error, id, name, className = "", ...props }, ref) => {
  const [show, setShow] = useState(false);
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium"
        style={{ color: "var(--heading-colour)" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          type={show ? "text" : "password"}
          className="placeholder:text-text-placeholder h-11 w-full rounded-full border px-4 pr-11 text-sm transition-all duration-200 outline-none"
          style={{
            borderColor: error
              ? "var(--input-error-red)"
              : "var(--input-border)",
            backgroundColor: "var(--input-bg)",
            color: "var(--heading-colour)",
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
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-icon-secondary hover:text-icon-primary absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--input-error-red)" }}>
          {error}
        </p>
      )}
    </div>
  );
});

DashPasswordInput.displayName = "DashPasswordInput";
