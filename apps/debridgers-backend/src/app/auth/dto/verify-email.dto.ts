import { z } from "zod";

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().min(1, "OTP is required"),
});

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
