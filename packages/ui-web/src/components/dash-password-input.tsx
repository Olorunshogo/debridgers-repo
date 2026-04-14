"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  BaseInputField,
  BASE_INPUT_CLASS,
  getInputStyles,
  getInputFocusHandlers,
} from "./base-input-field";

interface DashPasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const DashPasswordInput = forwardRef<
  HTMLInputElement,
  DashPasswordInputProps
>(({ label, error, id, name, required, className = "", ...props }, ref) => {
  const [show, setShow] = useState(false);
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <BaseInputField
      label={label}
      error={error}
      required={required}
      className={className}
      inputId={inputId}
    >
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          name={name ?? inputId}
          type={show ? "text" : "password"}
          className={BASE_INPUT_CLASS}
          style={getInputStyles(error)}
          {...getInputFocusHandlers(error)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-icon-secondary hover:text-icon-primary absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer transition-all duration-300 ease-in-out"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </BaseInputField>
  );
});

DashPasswordInput.displayName = "DashPasswordInput";
