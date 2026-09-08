import { Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeDownVariants, transitionBase } from "../../lib/motion/variants";

/*
 * Shown on login or signup when the account exists but its email is not
 * verified yet. A fresh OTP is already waiting server-side by the time this
 * renders, so the action is a plain navigation, never a resubmission.
 */

export interface VerifyEmailBannerProps {
  email?: string | null;
  onVerify: () => void;
}

export function VerifyEmailBanner({ email, onVerify }: VerifyEmailBannerProps) {
  return (
    <AnimatePresence>
      {email && (
        <motion.div
          variants={fadeDownVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionBase}
          role="alert"
          className="bg-status-pending text-status-pending-fg flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <span>{email} has not been verified yet.</span>
            <button
              type="button"
              onClick={onVerify}
              className="bg-status-pending-fg w-fit cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-opacity duration-300 ease-in-out hover:opacity-90"
            >
              Verify now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
