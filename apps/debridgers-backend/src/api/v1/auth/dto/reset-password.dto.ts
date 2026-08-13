import { z } from "zod";
import { passwordRule } from "./register.dto";

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordRule,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
