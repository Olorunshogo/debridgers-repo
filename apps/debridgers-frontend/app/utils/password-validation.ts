import { z } from "zod";

// Password must be at least 8 characters with uppercase, number, and special char
const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Temporary password is required"),
    new_password: passwordRule,
    confirm_password: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from temporary password",
    path: ["new_password"],
  });

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// Validates password change form and returns field-level errors
export function validatePasswordForm(
  formData: ChangePasswordForm,
): Partial<ChangePasswordForm> {
  const result = changePasswordSchema.safeParse(formData);
  if (result.success) {
    return {};
  }

  const newErrors: Partial<ChangePasswordForm> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path[0] as keyof ChangePasswordForm;
    newErrors[path] = issue.message;
  });
  return newErrors;
}
