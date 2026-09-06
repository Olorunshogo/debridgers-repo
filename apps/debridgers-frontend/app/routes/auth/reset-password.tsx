import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import {
  AuthFormShell,
  AuthCredentialsForm,
  fadeUpVariants,
  transitionBase,
  type AuthFieldDescriptor,
} from "@debridgers/ui-web";
import { useResetPassword } from "../../features/auth";

export function meta() {
  return [
    { title: "Reset Password | Debridgers" },
    {
      name: "description",
      content:
        "Set a new password for your Debridgers account. Use the reset token sent to your email to complete the process.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/*
 * The token arrives in the URL here, so it is prefilled and not shown as a
 * field. Contrast with /forgot-password, where the user types the code they were
 * emailed.
 */
const PASSWORD_FIELDS: readonly AuthFieldDescriptor[] = [
  {
    name: "password",
    label: "New password",
    type: "password",
    placeholder: "Min. 8 characters",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    type: "password",
    placeholder: "Repeat your password",
    autoComplete: "new-password",
  },
];

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { form, submit, apiError, isSubmitting, done } = useResetPassword({
    token,
    /* Stay on the page to show the confirmation rather than bouncing to /login. */
    onSuccess: () => undefined,
  });

  const missingToken = !token;

  return (
    <AuthFormShell
      heading={done ? "Password updated" : "Reset password"}
      apiError={
        missingToken && !done
          ? "Reset token is missing. Please use the link from your email."
          : apiError
      }
      subheading={
        done
          ? "Your password has been reset successfully."
          : "Must be at least 8 characters, with an uppercase letter, a number and a symbol."
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={done ? "success" : "form"}
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionBase}
          className="flex flex-col gap-6"
        >
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 size={48} className="text-primary" />
              <Link
                to="/login"
                className="bg-primary inline-flex cursor-pointer items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Log In
              </Link>
            </div>
          ) : (
            <AuthCredentialsForm
              fields={PASSWORD_FIELDS}
              form={form}
              onSubmit={submit}
              isSubmitting={isSubmitting}
              submitLabel="Reset password"
              submittingLabel="Resetting..."
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AuthFormShell>
  );
}
