import { z } from "zod";

export const nameEnquirySchema = z.object({
  bankCode: z.string().min(3, "Bank code required"),
  accountNumber: z.string().length(10, "Account number must be 10 digits"),
});

export type NameEnquiryDto = z.infer<typeof nameEnquirySchema>;
