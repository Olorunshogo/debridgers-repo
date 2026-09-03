import { z } from "zod";

/*
 * Proof of delivery is the record that an order was fulfilled, and this was the
 * one write in the codebase with no schema on it at all: a bare `@Body()` typed
 * inline, whose contents went straight into a jsonb column. Any array of any
 * strings of any length was accepted and stored.
 */

/** Matches the control's own ceiling in packages/ui-web photo-upload-field.tsx. */
export const MAX_DELIVERY_PHOTOS = 8;

/*
 * Photos arrive as base64 data URLs today. A hosted URL is accepted as well, so
 * moving to object storage later is a change of producer rather than a change
 * of contract.
 *
 * The length bound is the real guard. 5MB of image is roughly 6.7MB of base64,
 * and without a ceiling here the only thing between a client and an unbounded
 * row is the request body limit.
 */
const MAX_PHOTO_CHARS = 7_500_000;

const photo = z
  .string()
  .min(1, "Photo cannot be empty")
  .max(MAX_PHOTO_CHARS, "Photo is too large")
  .refine(
    (value) =>
      /^data:image\/(jpeg|jpg|png|webp);base64,/.test(value) ||
      /^https?:\/\//.test(value),
    "Each photo must be an image data URL or a hosted URL",
  );

export const verifyDeliverySchema = z.object({
  /*
   * At least one photo, because a verification with no evidence is the thing
   * this endpoint exists to prevent.
   */
  photos: z
    .array(photo)
    .min(1, "At least one delivery photo is required")
    .max(MAX_DELIVERY_PHOTOS, `At most ${MAX_DELIVERY_PHOTOS} photos`),
  notes: z.string().max(1000).optional(),
  /* Who took delivery, which is not always the buyer. */
  recipient_name: z.string().min(1).max(120).optional(),
});

export type VerifyDeliveryDto = z.infer<typeof verifyDeliverySchema>;
