import { z } from "zod";

export const submitKycSchema = z.object({
  id_type: z.enum(["NIN", "Passport", "Drivers License"]),
  bank_name: z.string().min(2, "Bank name is required"),
  bank_account_number: z
    .string()
    .min(10, "Account number must be at least 10 digits")
    .max(10, "Account number must be 10 digits"),
  bank_account_name: z.string().min(2, "Account name is required"),
});

export type SubmitKycDto = z.infer<typeof submitKycSchema>;
