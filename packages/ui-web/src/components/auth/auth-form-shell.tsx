import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { AppLogo } from "../app-logo";
import { fadeDownVariants, transitionBase } from "../../lib/motion/variants";

/*
 * The two-panel auth page chrome: brand panel on the left at lg and up, form
 * panel on the right, plus the heading block and API error banner every auth
 * screen needs.
 *
 * Takes children rather than a form definition so a consumer can put anything
 * inside - a form, a success panel, an OTP grid. Per the shared-component rule,
 * this returns page chrome and a slot, and never owns routing or submission.
 */

export interface AuthFormShellProps {
  heading: string;
  /** Rendered under the heading. Use for the "No account? Sign up" line. */
  subheading?: ReactNode;
  /** Marketing copy in the brand panel. */
  tagline?: string;
  apiError?: string | null;
  children: ReactNode;
}

export function AuthFormShell({
  heading,
  subheading,
  tagline = "Fresh food at market prices, delivered to your door step.",
  apiError,
  children,
}: AuthFormShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div className="bg-primary hidden flex-col justify-center p-12 lg:flex lg:w-100">
        <div className="flex w-full flex-col gap-12">
          <Link to="/" className="flex w-fit items-center gap-2">
            <span className="font-syne text-xl font-bold text-white">
              Debridgers
            </span>
          </Link>
          <p className="max-w-80 text-lg leading-relaxed text-white">
            {tagline}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-white px-6 lg:px-16">
        <div className="flex w-full max-w-125 flex-col gap-6">
          <Link to="/" className="flex justify-center lg:hidden">
            <AppLogo />
          </Link>

          <div className="flex flex-col gap-1">
            <h1 className="font-syne text-heading text-2xl font-bold">
              {heading}
            </h1>
            {subheading && <p className="text-text text-sm">{subheading}</p>}
          </div>

          <AnimatePresence>
            {apiError && (
              <motion.div
                variants={fadeDownVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionBase}
                className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm"
              >
                {apiError}
              </motion.div>
            )}
          </AnimatePresence>

          {children}
        </div>
      </div>
    </div>
  );
}
