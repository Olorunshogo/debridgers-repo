import { z } from "zod";

/*
 * Multipart apply: password creates an applicant account so the later
 * applicant dashboard can log in. Existing applicant emails reuse the user.
 */
export const applyJobSchema = z
  .object({
    first_name: z.string().min(2, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Invalid phone number"),
    cover_letter: z.string().max(10000).optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ApplyJobDto = z.infer<typeof applyJobSchema>;

export const screenApplicationSchema = z.object({
  status: z.enum(["screening", "passed", "rejected"]),
  notes: z.string().max(5000).optional(),
  rejection_feedback: z.string().max(2000).optional(),
});

export type ScreenApplicationDto = z.infer<typeof screenApplicationSchema>;
