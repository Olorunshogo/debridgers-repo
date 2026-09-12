import { z } from "zod";

export const setDeliveryQuoteSchema = z.object({
  deliveryFeeNaira: z
    .number({ message: "Enter a delivery fee" })
    .nonnegative("Delivery fee cannot be negative"),
});

export type SetDeliveryQuoteValues = z.infer<typeof setDeliveryQuoteSchema>;
