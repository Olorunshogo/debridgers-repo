import { useState, useRef, useCallback } from "react";
import {
  Upload as UploadIcon,
  CheckCircle2,
  Trash2,
  FileUp,
  Dot,
} from "lucide-react";
import { cn } from "../lib/utils";

// === Types
type FileUploadFieldProps = {
  label: string;
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
  error?: string;
  onFileChange?: (file: File | null) => void;
};

// === Component
export function FileUploadField({
  label,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  required = false,
  error,
  onFileChange,
}: FileUploadFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formattedTypes = accept
    .split(",")
    .map((ext) => ext.replace(".", "").toUpperCase())
    .join(", ");

  const formatSize = (bytes: number) => (bytes / 1024).toFixed(0) + "KB";

  const handleFiles = useCallback(
    (selectedFiles: FileList | null) => {
      const f = selectedFiles?.[0];
      if (!f) return;

      if (f.size > maxSizeMB * 1024 * 1024) {
        setLocalError(`File too large (max ${maxSizeMB}MB)`);
        return;
      }

      setLocalError(null);
      setFile(f);
      onFileChange?.(f);
    },
    [maxSizeMB, onFileChange],
  );

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setLocalError(null);
    onFileChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const displayError = error ?? localError;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {/* Label */}
      <label className="flex cursor-pointer items-center gap-1">
        <span className="text-heading font-syne font-medium">{label}</span>
        {!required && (
          <span className="text-body font-open-sans text-sm">(optional)</span>
        )}
      </label>

      {/* Drop zone / file card */}
      {file ? (
        // === Selected file card
        <div
          className={cn(
            "bg-input-bg flex items-center justify-between rounded-full border px-4 py-2.5 transition-all duration-300 ease-in-out",
            displayError ? "border-input-error-red" : "border-input-border",
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <FileUp size={14} className="text-white" />
            </span>
            <span className="text-heading font-syne truncate text-sm font-medium">
              {file.name}
            </span>
            <Dot className="text-body" />
            <span className="text-body font-syne shrink-0 text-xs">
              {formatSize(file.size)}
            </span>
            <CheckCircle2
              fill="currentColor"
              stroke="white"
              strokeWidth={3}
              size={16}
              className="text-status-delivered-fg shrink-0"
            />
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-body hover:text-input-error-red ml-2 shrink-0 cursor-pointer transition-all duration-300 ease-in-out"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        // === Drop zone
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "bg-input-bg cursor-pointer rounded-full border px-4 py-2.5 transition-all duration-300 ease-in-out",
            displayError
              ? "border-input-error-red"
              : "border-input-border hover:border-input-border-focus",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-placeholder-text font-syne text-sm">
              {formattedTypes}: up to {maxSizeMB}MB
            </span>
            <div className="border-input-border text-heading flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-sm font-semibold transition-all duration-300 ease-in-out">
              <UploadIcon size={14} strokeWidth={2.5} />
              <span className="font-syne">Upload</span>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Error */}
      {displayError && (
        <p className="text-input-error-red font-syne text-xs">{displayError}</p>
      )}
    </div>
  );
}
