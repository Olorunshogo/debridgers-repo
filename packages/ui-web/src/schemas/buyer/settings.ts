import { z } from "zod";
import { createRequiredString } from "../generics";

/* Mirrors updateProfileSchema on the backend (apps/debridgers-backend/src/api/v1/buyer/dto/update-profile.dto.ts). */
export const buyerSettingsSchema = z.object({
  userName: createRequiredString("Name", { min: 2 }),
  currency: z.string().min(1, "Select a currency"),
  country: z.string().min(1, "Select a country"),
  deliveryAddress: z.string(),
  emailNotification: z.boolean(),
  smsNotification: z.boolean(),
  twoFactor: z.boolean(),
});

export type BuyerSettingsValues = z.infer<typeof buyerSettingsSchema>;
