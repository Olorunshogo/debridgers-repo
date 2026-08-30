import { useState, useRef, useCallback } from "react";
import { Camera, X, Upload as UploadIcon } from "lucide-react";
import { cn } from "../lib/utils";

/*
 * The multi-image sibling of FileUploadField.
 *
 * FileUploadField holds a single file and renders it as a filename chip, which
 * is right for a KYC document but wrong for proof-of-delivery: those are photos,
 * there are several, and the whole point is seeing them before submitting.
 *
 * File and preview travel together in one PhotoUpload rather than as parallel
 * arrays. Reading a file is async, so two arrays filled from separate
 * FileReader callbacks can settle in a different order than they were picked,
 * and an index into one then points at the wrong entry in the other.
 */

// === Types

export interface PhotoUpload {
  file: File;
  /** Data URL, both for the preview and for the request body. */
  dataUrl: string;
}

interface PhotoUploadFieldProps {
  label: string;
  photos: PhotoUpload[];
  onPhotosChange: (photos: PhotoUpload[]) => void;
  required?: boolean;
  error?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  hint?: string;
}

// === Helpers

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// === Component

export function PhotoUploadField({
  label,
  photos,
  onPhotosChange,
  required = false,
  error,
  maxSizeMB = 5,
  maxFiles = 8,
  hint,
}: PhotoUploadFieldProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null): Promise<void> => {
      const picked = Array.from(fileList ?? []);
      if (picked.length === 0) return;

      const room = maxFiles - photos.length;
      if (room <= 0) {
        setLocalError(`You can attach at most ${maxFiles} photos.`);
        return;
      }

      const images = picked.filter((f) => f.type.startsWith("image/"));
      if (images.length !== picked.length) {
        setLocalError("Only image files can be attached.");
        return;
      }

      const withinSize = images.filter(
        (f) => f.size <= maxSizeMB * 1024 * 1024,
      );
      if (withinSize.length !== images.length) {
        setLocalError(`Each photo must be ${maxSizeMB}MB or smaller.`);
        return;
      }

      setLocalError(
        withinSize.length > room
          ? `Only the first ${room} of those fit; the limit is ${maxFiles}.`
          : null,
      );

      const accepted = withinSize.slice(0, room);
      const read = await Promise.all(
        accepted.map(async (file) => ({
          file,
          dataUrl: await readAsDataUrl(file),
        })),
      );

      onPhotosChange([...photos, ...read]);
    },
    [maxFiles, maxSizeMB, onPhotosChange, photos],
  );

  function removeAt(index: number): void {
    setLocalError(null);
    onPhotosChange(photos.filter((_, i) => i !== index));
  }

  const displayError = error ?? localError;
  const isFull = photos.length >= maxFiles;

  return (
    <div className="flex w-full flex-col gap-3">
      <label className="flex items-center gap-1">
        <span className="text-heading font-syne font-medium">{label}</span>
        {!required && (
          <span className="text-body font-open-sans text-sm">(optional)</span>
        )}
      </label>

      {/*
       * A real button, not a clickable div: the div it replaced took no focus
       * at all, so the whole control was unreachable by keyboard. Focus and
       * hover shift the border rather than flooding the background, matching
       * every other input in the system.
       */}
      <button
        type="button"
        disabled={isFull}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isFull) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isFull) void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "bg-input-bg flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ease-in-out outline-none",
          "focus-visible:border-input-border-focus hover:border-input-border-focus",
          "disabled:hover:border-input-border disabled:cursor-not-allowed disabled:opacity-60",
          displayError
            ? "border-input-error-red"
            : isDragging
              ? "border-input-border-focus"
              : "border-input-border",
        )}
      >
        <Camera size={32} className="text-icon-secondary" />
        <span className="text-heading font-syne font-semibold">
          {isFull ? `Photo limit reached (${maxFiles})` : "Add delivery photos"}
        </span>
        <span className="text-placeholder-text font-syne text-sm">
          {hint ??
            `Drag and drop, or click to browse. Up to ${maxSizeMB}MB each.`}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          void handleFiles(e.target.files);
          /* Lets the same file be re-picked after a remove. */
          e.target.value = "";
        }}
        className="hidden"
      />

      {photos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-body font-syne text-sm font-semibold">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} attached
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo, i) => (
              <div
                key={photo.dataUrl}
                className="border-line bg-light-bg relative aspect-square overflow-hidden rounded-xl border"
              >
                <img
                  src={photo.dataUrl}
                  alt={`Delivery photo ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {/*
                 * Always visible, not revealed on hover: a hover-only control
                 * is unusable on touch, which is where a delivery admin most
                 * likely is.
                 */}
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => removeAt(i)}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {!isFull && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="border-input-border text-icon-secondary hover:border-input-border-focus focus-visible:border-input-border-focus flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out outline-none"
                aria-label="Add more photos"
              >
                <UploadIcon size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {displayError && (
        <p className="text-input-error-red font-syne text-xs">{displayError}</p>
      )}
    </div>
  );
}

PhotoUploadField.displayName = "PhotoUploadField";
