import { z } from "zod";

/*
 * Agent-initiated payout request.
 *
 * Bank details are copied onto the withdrawal row at request time rather than
 * read from the profile when it is paid: an agent who edits their account
 * details afterwards must not silently redirect a payout that is already
 * in the approval queue.
 * amount_kobo is kobo, so no float ever reaches the ledger.
 */
export const requestWithdrawalSchema = z.object({
  amount_kobo: z
    .number()
    .int("Amount must be a whole number of kobo")
    .positive("Amount must be greater than zero"),
});

export type RequestWithdrawalDto = z.infer<typeof requestWithdrawalSchema>;
