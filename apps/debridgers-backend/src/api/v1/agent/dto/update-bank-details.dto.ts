import { z } from "zod";

/*
 * `bank_code` is the SafeHaven bank code, not a display name. The name is
 * resolved server-side from the bank list so a client cannot store a label that
 * disagrees with the code a transfer will actually use.
 */
export const updateBankDetailsSchema = z.object({
  bank_code: z
    .string()
    .min(3, "Select your bank")
    .max(10, "Invalid bank code")
    .regex(/^\d+$/, "Bank code must be digits only"),
  account_number: z
    .string()
    .length(10, "Account number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Account number must be 10 digits"),
});

export type UpdateBankDetailsDto = z.infer<typeof updateBankDetailsSchema>;

export const resolveBankAccountSchema = updateBankDetailsSchema;

export type ResolveBankAccountDto = UpdateBankDetailsDto;
