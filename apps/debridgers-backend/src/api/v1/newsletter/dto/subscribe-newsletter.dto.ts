import { z } from "zod";

export const subscribeNewsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type SubscribeNewsletterDto = z.infer<typeof subscribeNewsletterSchema>;
