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
    /*
     * h-screen + overflow-hidden here, deliberately: this is the one place
     * that hands scrolling to exactly one child below, not the accidental
     * kind (see IntroAnimation's body-lock). The brand panel never needs to
     * scroll; the form panel is the only one that can outgrow the viewport.
     */
    <div className="flex h-screen w-full overflow-hidden">
      {/* Brand panel - fixed at 100vh, stays put while the form scrolls */}
      <div className="bg-primary hidden h-screen flex-col justify-center p-12 lg:flex lg:w-100">
        <div className="flex w-full flex-col gap-12">
          <Link to="/" className="flex w-fit items-center gap-2">
            <AppLogo variant="white" />
          </Link>
          <p className="max-w-80 text-lg leading-relaxed text-white">
            {tagline}
          </p>
        </div>
      </div>

      {/* Form panel - the only scrollable region */}
      <div className="h-screen flex-1 overflow-y-auto bg-white px-6 lg:px-16">
        {/*
         * min-h-full, not h-full: centers short content (login) exactly as
         * before, but lets tall content (signup) grow past the viewport
         * instead of fighting the centering, which is what clips or strands
         * the top of the content when overflow and justify-center land on
         * the same scrolling element.
         */}
        <div className="py-section-py sm:py-section-py-sm lg:py-section-py-lg flex min-h-full flex-col items-center justify-center">
          <div className="flex w-full max-w-125 flex-col gap-6">
            <Link to="/" className="flex justify-center lg:hidden">
              <AppLogo />
            </Link>

            <div className="flex flex-col gap-1">
              <h1 className="font-syne text-heading text-2xl font-bold">
                {heading}
              </h1>
              {subheading && <p className="text-body text-sm">{subheading}</p>}
            </div>

            <AnimatePresence>
              {apiError && (
                <motion.div
                  variants={fadeDownVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transitionBase}
                  className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm"
                >
                  {apiError}
                </motion.div>
              )}
            </AnimatePresence>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
