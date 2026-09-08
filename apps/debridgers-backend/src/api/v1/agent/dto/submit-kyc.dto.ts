import { z } from "zod";

/*
 * bank_code is optional so existing multipart clients keep working, but supplying it is what makes an agent payable.
 * A transfer needs the numeric code, and a bank name alone left `bank_code` null, which blocked every payout request.
 */
export const submitKycSchema = z.object({
  id_type: z.enum(["NIN", "Passport", "Drivers License"]),
  bank_name: z.string().min(2, "Bank name is required"),
  bank_code: z
    .string()
    .regex(/^\d{3,10}$/, "Bank code must be 3 to 10 digits")
    .optional(),
  bank_account_number: z
    .string()
    .min(10, "Account number must be at least 10 digits")
    .max(10, "Account number must be 10 digits"),
  bank_account_name: z.string().min(2, "Account name is required"),
});

export type SubmitKycDto = z.infer<typeof submitKycSchema>;
