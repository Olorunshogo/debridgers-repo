import { z } from "zod";

export const verifyInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  invite_code: z.string().length(32, "Invite code must be 32 characters"),
});

export type VerifyInviteForm = z.infer<typeof verifyInviteSchema>;

// Validates invite verification form and returns field-level errors
export function validateInviteForm(
  formData: VerifyInviteForm,
): Partial<VerifyInviteForm> {
  const result = verifyInviteSchema.safeParse(formData);
  if (result.success) {
    return {};
  }

  const newErrors: Partial<VerifyInviteForm> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path[0] as keyof VerifyInviteForm;
    newErrors[path] = issue.message;
  });
  return newErrors;
}
