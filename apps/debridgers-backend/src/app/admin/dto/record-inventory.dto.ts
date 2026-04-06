import { z } from "zod";

export const recordInventorySchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  source: z.string().min(1).default("Agrolinking"),
  notes: z.string().max(500).optional(),
});

export type RecordInventoryDto = z.infer<typeof recordInventorySchema>;
