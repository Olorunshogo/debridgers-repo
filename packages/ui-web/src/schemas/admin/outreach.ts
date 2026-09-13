import { z } from "zod";

/* Mirrors createOutreachSchema on the backend (apps/debridgers-backend/src/api/v1/admin/admin.controller.ts). */
export const createOutreachRecordSchema = z.object({
  shopName: z.string().min(1, "Shop/customer name is required"),
  ownerName: z.string(),
  phone: z.string().min(6, "Enter a valid phone number"),
  lga: z.string(),
  area: z.string(),
  address: z.string(),
  productInterest: z.string(),
  quantity: z.string(),
  notes: z.string(),
  collectedBy: z.string(),
  visitDate: z.string(),
});

export type CreateOutreachRecordValues = z.infer<
  typeof createOutreachRecordSchema
>;
