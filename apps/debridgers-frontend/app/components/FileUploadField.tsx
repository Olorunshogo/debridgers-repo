import { useState, useRef, useCallback } from "react";
import {
  Upload as UploadIcon,
  CheckCircle2,
  Trash2,
  FileUp,
  Dot,
} from "lucide-react";
import { cn } from "@debridgers/ui-web";

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
        <span
          className="font-syne font-medium"
          style={{ color: "var(--heading-colour)" }}
        >
          {label}
        </span>
        {!required && (
          <span
            className="font-open-sans text-sm"
            style={{ color: "var(--text-colour)" }}
          >
            (optional)
          </span>
        )}
      </label>

      {/* Drop zone / file card */}
      {file ? (
        // === Selected file card
        <div
          className={cn(
            "flex items-center justify-between rounded-full border px-4 py-2.5 transition-all duration-300 ease-in-out",
          )}
          style={{
            borderColor: displayError
              ? "var(--input-error-red)"
              : "var(--input-border)",
            backgroundColor: "var(--input-bg)",
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              <FileUp size={14} className="text-white" />
            </span>
            <span
              className="font-syne truncate text-sm font-medium"
              style={{ color: "var(--heading-colour)" }}
            >
              {file.name}
            </span>
            <Dot style={{ color: "var(--text-colour)" }} />
            <span
              className="font-syne shrink-0 text-xs"
              style={{ color: "var(--text-colour)" }}
            >
              {formatSize(file.size)}
            </span>
            <CheckCircle2
              fill="currentColor"
              stroke="white"
              strokeWidth={3}
              size={16}
              className="shrink-0 text-green-500"
            />
          </div>
          <button
            type="button"
            onClick={reset}
            className="ml-2 shrink-0 cursor-pointer transition-all duration-300 ease-in-out"
            style={{ color: "var(--text-colour)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--input-error-red)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-colour)")
            }
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
          className="cursor-pointer rounded-full border px-4 py-2.5 transition-all duration-300 ease-in-out"
          style={{
            borderColor: displayError
              ? "var(--input-error-red)"
              : "var(--input-border)",
            backgroundColor: "var(--input-bg)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = displayError
              ? "var(--input-error-red)"
              : "var(--input-border-focus)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = displayError
              ? "var(--input-error-red)"
              : "var(--input-border)")
          }
        >
          <div className="flex items-center justify-between">
            <span
              className="font-syne text-sm"
              style={{ color: "var(--text-placeholder)" }}
            >
              {formattedTypes}: up to {maxSizeMB}MB
            </span>
            <div
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-all duration-300 ease-in-out"
              style={{
                borderColor: "var(--input-border)",
                color: "var(--heading-colour)",
                backgroundColor: "var(--white)",
              }}
            >
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
        <p
          className="font-syne text-xs"
          style={{ color: "var(--input-error-red)" }}
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
