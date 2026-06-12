"use client";

import React from "react";

interface DashSwitchInputProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  id?: string;
}

export function DashSwitchInput({
  checked,
  onCheckedChange,
  label,
  description,
  id,
}: DashSwitchInputProps) {
  const switchId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "switch";

  return (
    <div className="font-syne flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <span className="text-heading text-sm font-medium">{label}</span>
          )}
          {description && (
            <span className="text-text text-xs">{description}</span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${checked ? "bg-primary" : "bg-border-gray"}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5.5" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
