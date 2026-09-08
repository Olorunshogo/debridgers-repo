import type { FacetDefinition } from "@debridgers/ratings";
import { cn } from "../../lib/utils";

/*
 * Multi-select chip row for one facet group. Wraps on narrow screens rather than scrolling, since a rating form is short enough that wrapping never pushes the submit button out of reach.
 */

export interface FacetChipsProps {
  facets: FacetDefinition[];
  selected: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
}

export function FacetChips({
  facets,
  selected,
  onToggle,
  disabled = false,
}: FacetChipsProps) {
  return (
    <div
      role="group"
      aria-label="What stood out"
      className="flex flex-wrap gap-2"
    >
      {facets.map((facet) => {
        const active = selected.includes(facet.key);
        return (
          <button
            key={facet.key}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onToggle(facet.key)}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "bg-primary border-primary text-white"
                : "border-line text-body hover:border-primary",
            )}
          >
            {facet.label}
          </button>
        );
      })}
    </div>
  );
}

FacetChips.displayName = "FacetChips";
