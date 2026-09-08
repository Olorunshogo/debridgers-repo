import { Star } from "lucide-react";

export interface RatingCardData {
  score: number;
  comment?: string | null;
  facets: string[];
  createdAt: string;
  /** First name plus last initial, or a full name for a named context - the caller resolves anonymity, this just renders whatever string it gets. */
  authorLabel: string;
}

export interface RatingCardProps {
  rating: RatingCardData;
  /** Facet keys resolved to their display label, keyed by facet key. */
  facetLabels?: Record<string, string>;
}

export function RatingCard({ rating, facetLabels = {} }: RatingCardProps) {
  return (
    <div className="border-line flex flex-col gap-2 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              className={
                star <= rating.score
                  ? "fill-secondary text-secondary"
                  : "text-icon-tertiary"
              }
            />
          ))}
        </div>
        <span className="text-body text-xs">
          {new Date(rating.createdAt).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <p className="text-heading text-sm font-semibold">{rating.authorLabel}</p>

      {rating.comment && <p className="text-body text-sm">{rating.comment}</p>}

      {rating.facets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {rating.facets.map((key) => (
            <span
              key={key}
              className="bg-light-bg text-body rounded-full px-2.5 py-1 text-xs"
            >
              {facetLabels[key] ?? key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

RatingCard.displayName = "RatingCard";
