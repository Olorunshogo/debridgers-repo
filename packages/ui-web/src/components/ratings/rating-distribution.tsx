import type { ScoreDistribution } from "@debridgers/ratings";

export interface RatingDistributionProps {
  distribution: ScoreDistribution;
}

/** The five bar rows behind a rating summary, star 5 down to star 1. */
export function RatingDistribution({ distribution }: RatingDistributionProps) {
  const total = distribution.reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col gap-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1];
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="text-body w-3 shrink-0">{star}</span>
            <div className="bg-light-bg h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-secondary h-full rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-body w-6 shrink-0 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

RatingDistribution.displayName = "RatingDistribution";
