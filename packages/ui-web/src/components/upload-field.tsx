import { useState, useRef, useCallback } from "react";
import {
  Upload as UploadIcon,
  CheckCircle2,
  Trash2,
  FileUp,
  Dot,
  Camera,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

/*
 * PhotoUploadField is the multi-image sibling of FileUploadField.
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

export interface FileUploadProps {
  label: string;
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
  error?: string;
  onFileChange?: (file: File | null) => void;
}

export interface PhotoUpload {
  file: File;
  /** Data URL, both for the preview and for the request body. */
  dataUrl: string;
}

export interface PhotoUploadProps {
  label: string;
  photos: PhotoUpload[];
  onPhotosChange: (photos: PhotoUpload[]) => void;
  required?: boolean;
  error?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  hint?: string;
}

export type UploadFieldProps =
  | ({ kind?: "file" } & FileUploadProps)
  | ({ kind: "photo" } & PhotoUploadProps);

// === Helpers

/*
 * Longest edge a proof photo is reduced to before encoding.
 *
 * A modern phone camera produces 3 to 5MB per shot, and these travel to the
 * server as base64 inside a JSON body, which adds a third on top. Eight
 * untouched photos is over 50MB of request for something a person glances at
 * once to confirm the right bags reached the right gate.
 *
 * 1600px keeps a bag label readable while bringing a typical photo under 400KB.
 */
const MAX_EDGE_PX = 1600;

/*
 * Quality is stepped down until the encoded photo fits the budget below, rather
 * than fixed. A fixed quality bounds nothing: a busy photo at 0.82 can still
 * come out several times larger than a plain one, so the request size would
 * depend on what the yard happened to look like.
 *
 * Stepping makes the payload predictable, which is what lets the server run a
 * modest body limit instead of one sized for the theoretical worst case.
 */
const JPEG_QUALITY_STEPS = [0.82, 0.65, 0.5] as const;

/** Budget per encoded photo, in bytes of base64. */
const TARGET_ENCODED_BYTES = 1_200_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/*
 * Downscales in the browser, then re-encodes as JPEG.
 *
 * Falls back to the untouched data URL whenever anything is unavailable or
 * throws: an image that decodes but will not draw, a canvas that refuses to
 * export, an environment with no createImageBitmap. Sending a large photo is a
 * worse outcome than sending a small one, but it is a far better outcome than
 * failing the verification, which is the only record that the order arrived.
 */
async function downscaleToDataUrl(file: File): Promise<string> {
  const original = await readAsDataUrl(file);

  try {
    if (typeof document === "undefined") return original;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
    );

    /*
     * Already within both the dimension cap and the size budget, so re-encoding
     * would only lose quality for nothing.
     */
    if (scale === 1 && original.length <= TARGET_ENCODED_BYTES) {
      bitmap.close();
      return original;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return original;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let encoded = "";
    for (const quality of JPEG_QUALITY_STEPS) {
      encoded = canvas.toDataURL("image/jpeg", quality);
      if (encoded.length <= TARGET_ENCODED_BYTES) break;
    }

    /* A canvas tainted by cross-origin data returns a stub rather than throwing. */
    if (encoded.length <= "data:image/jpeg;base64,".length) return original;

    /* Whichever is smaller: re-encoding a small PNG can make it larger. */
    return encoded.length < original.length ? encoded : original;
  } catch {
    return original;
  }
}

// === File component

function FileUploadFieldImpl({
  label,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  required = false,
  error,
  onFileChange,
}: FileUploadProps): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formattedTypes = accept
    .split(",")
    .map((ext) => ext.replace(".", "").toUpperCase())
    .join(", ");

  const formatSize = (bytes: number): string =>
    (bytes / 1024).toFixed(0) + "KB";

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

// === Photo component

function PhotoUploadFieldImpl({
  label,
  photos,
  onPhotosChange,
  required = false,
  error,
  maxSizeMB = 5,
  maxFiles = 8,
  hint,
}: PhotoUploadProps): React.JSX.Element {
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
          dataUrl: await downscaleToDataUrl(file),
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

// === Component

export function UploadField(props: UploadFieldProps): React.JSX.Element {
  if (props.kind === "photo") {
    const { kind: _kind, ...photoProps } = props;
    return <PhotoUploadFieldImpl {...photoProps} />;
  }

  const { kind: _kind, ...fileProps } = props;
  return <FileUploadFieldImpl {...fileProps} />;
}
