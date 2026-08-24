import { z } from "zod";
import { passwordRule } from "../../auth/dto/register.dto";

export const adminChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Temporary password is required"),
  new_password: passwordRule,
});

export type AdminChangePasswordDto = z.infer<typeof adminChangePasswordSchema>;
