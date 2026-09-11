import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RATING_CONTEXTS,
  facetsForGroup,
  type RatingContextKey,
} from "@debridgers/ratings";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import { DialogSuccessPanel } from "../../lib/dialog/dialog-success-panel";
import { SubmitButton } from "../submit-button";
import { TextareaField } from "../textarea-field";
import { RatingInput } from "./rating-input";
import { FacetChips } from "./facet-chips";
import {
  buildRatingSchema,
  type RatingValues,
} from "../../schemas/ratings/ratingSchema";

/*
 * Presentation only: no data fetching, no routing, no useDialog.
 * The consuming app's glue component wires this to the API - see AgentRequestPayoutDialog for the split this mirrors.
 * One component renders every context; adding a context later is a registry entry in @debridgers/ratings, never a change here.
 */

export interface RatingSheetProps {
  contextKey: RatingContextKey;
  /** What the target is called in this instance - "your agent", "this order" - filled in per submission, not per context. */
  subjectLabel?: string;
  onSubmitRating: (values: RatingValues) => void | Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  error?: string | null;
  success: boolean;
}

export function RatingSheet({
  contextKey,
  subjectLabel,
  onSubmitRating,
  onClose,
  isSubmitting,
  error,
  success,
}: RatingSheetProps) {
  const context = RATING_CONTEXTS[contextKey];
  const facets = facetsForGroup(context.targets[0].facetGroup);
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RatingValues>({
    resolver: zodResolver(buildRatingSchema(context)),
    mode: "onChange",
    defaultValues: { score: 0, facets: [], comment: "" },
  });

  function toggleFacet(key: string): void {
    setSelectedFacets((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader title="Thank you" showCloser={false} />
        <DialogSuccessPanel
          title="Rating submitted"
          description="Your feedback has been recorded."
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <DialogHeader
        title={context.title}
        description={subjectLabel ?? context.description}
        onClose={onClose}
      />

      <DialogErrorBanner message={error} />

      <form
        onSubmit={handleSubmit((values) =>
          onSubmitRating({ ...values, facets: selectedFacets }),
        )}
        noValidate
        className="flex flex-col gap-5"
      >
        <Controller
          name="score"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col items-center gap-2">
              <RatingInput value={field.value} onChange={field.onChange} />
              {errors.score && (
                <p className="text-input-error-red text-xs">
                  {errors.score.message}
                </p>
              )}
            </div>
          )}
        />

        {facets.length > 0 && (
          <FacetChips
            facets={facets}
            selected={selectedFacets}
            onToggle={toggleFacet}
            disabled={isSubmitting}
          />
        )}

        {context.allowComment && (
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <TextareaField
                label="Anything else? (optional)"
                value={field.value ?? ""}
                onChange={field.onChange}
                maxWords={200}
              />
            )}
          />
        )}

        <SubmitButton
          variant="block"
          loading={isSubmitting}
          loadingText="Submitting..."
          className="rounded-full"
        >
          Submit rating
        </SubmitButton>
      </form>
    </div>
  );
}

RatingSheet.displayName = "RatingSheet";
