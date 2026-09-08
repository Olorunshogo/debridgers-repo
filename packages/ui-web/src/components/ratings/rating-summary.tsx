import { Star } from "lucide-react";
import type { ScoreDistribution } from "@debridgers/ratings";
import { RatingDistribution } from "./rating-distribution";

export interface RatingSummaryData {
  score: string;
  count: number;
  displayable: boolean;
  distribution: ScoreDistribution;
}

export interface RatingSummaryProps {
  data: RatingSummaryData;
  label?: string;
}

/*
 * Below MIN_DISPLAY_COUNT this shows a "New" badge rather than a number.
 * A count of two rounded up to a confident-looking average is worse than admitting there is not enough data yet.
 */
export function RatingSummary({ data, label }: RatingSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {data.displayable ? (
          <>
            <span className="font-syne text-heading flex items-center gap-1 text-2xl font-bold">
              <Star size={20} className="fill-secondary text-secondary" />
              {data.score}
            </span>
            <span className="text-body text-sm">
              {data.count} rating{data.count === 1 ? "" : "s"}
              {label ? ` · ${label}` : ""}
            </span>
          </>
        ) : (
          <span className="bg-accent-soft text-accent-soft-fg rounded-full px-3 py-1 text-xs font-semibold">
            New
          </span>
        )}
      </div>

      {data.displayable && (
        <RatingDistribution distribution={data.distribution} />
      )}
    </div>
  );
}

RatingSummary.displayName = "RatingSummary";
