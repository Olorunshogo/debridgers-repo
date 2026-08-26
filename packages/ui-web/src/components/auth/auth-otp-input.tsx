import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { staggerItemVariants, staggerDelay } from "../../lib/motion/variants";

/*
 * Segmented one-time-code input.
 *
 * Owns only keyboard and paste mechanics: auto-advance on entry, backspace to
 * the previous box, paste of a full code, and digit filtering. The value is a
 * single string so the consumer never juggles an array of digits.
 */

export interface AuthOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the last box is filled, for auto-submit. */
  onComplete?: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  label?: string;
}

export function AuthOtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  error,
  disabled = false,
  label = "Verification code",
}: AuthOtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const commit = useCallback(
    (next: string): void => {
      const cleaned = next.replace(/\D/g, "").slice(0, length);
      onChange(cleaned);
      if (cleaned.length === length && onComplete) onComplete(cleaned);
    },
    [length, onChange, onComplete],
  );

  function handleChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const next = digits.slice();
    next[index] = digit;
    commit(next.join(""));

    if (index < length - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = digits.slice();

      if (next[index]) {
        next[index] = "";
        commit(next.join(""));
        return;
      }

      if (index > 0) {
        next[index - 1] = "";
        commit(next.join(""));
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>): void {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    commit(pasted);
    const filled = Math.min(pasted.replace(/\D/g, "").length, length) - 1;
    inputRefs.current[Math.max(filled, 0)]?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="text-body mb-2 text-sm font-medium">{label}</legend>

        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <motion.input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              aria-label={`Digit ${index + 1} of ${length}`}
              aria-invalid={Boolean(error)}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              variants={staggerItemVariants}
              initial="initial"
              animate="animate"
              transition={staggerDelay(index, 0.04)}
              className={`font-syne h-14 w-full rounded-xl border text-center text-xl font-bold transition-colors focus:outline-none disabled:opacity-60 ${
                error
                  ? "border-input-error-red text-input-error-red"
                  : "border-input-border text-heading focus:border-input-border-focus"
              }`}
            />
          ))}
        </div>
      </fieldset>

      {error && <p className="text-input-error-red text-xs">{error}</p>}
    </div>
  );
}
