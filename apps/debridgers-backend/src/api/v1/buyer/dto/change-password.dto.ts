import { z } from "zod";
import { passwordRule } from "../../auth/dto/register.dto";

/*
 * Reuses the registration password rule so a password set at signup and one set
 * here cannot drift apart in strength.
 */
export const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: passwordRule,
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
