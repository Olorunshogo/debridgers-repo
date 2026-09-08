import { Star } from "lucide-react";
import { cn } from "../../lib/utils";

/*
 * Five-point input, controlled, one shared component for every rating context.
 * Keyboard focus moves star to star with the native tab order; arrow keys are not intercepted, so screen readers keep their normal radio-group behaviour.
 */

export interface RatingInputProps {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  size?: number;
  className?: string;
}

const SCORES = [1, 2, 3, 4, 5] as const;

export function RatingInput({
  value,
  onChange,
  disabled = false,
  size = 28,
  className,
}: RatingInputProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      className={cn("flex items-center gap-1", className)}
    >
      {SCORES.map((score) => {
        const filled = score <= value;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} star${score === 1 ? "" : "s"}`}
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              "cursor-pointer transition-transform duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-60",
              !disabled && "hover:scale-110",
            )}
          >
            <Star
              size={size}
              className={
                filled ? "fill-secondary text-secondary" : "text-icon-tertiary"
              }
            />
          </button>
        );
      })}
    </div>
  );
}

RatingInput.displayName = "RatingInput";
