import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { AppLogo } from "../app-logo";
import { VerifyEmailBanner } from "./verify-email-banner";
import {
  fadeDownVariants,
  fadeVariants,
  transitionBase,
  transitionSlow,
} from "../../lib/motion/variants";

/*
 * The two-panel auth page chrome: a full-bleed image panel on the left at lg
 * and up, form panel on the right, plus the heading block and API error
 * banner every auth screen needs.
 *
 * Takes children rather than a form definition so a consumer can put anything
 * inside - a form, a success panel, an OTP grid. Per the shared-component rule,
 * this returns page chrome and a slot, and never owns routing or submission.
 */

export interface AuthImageSlide {
  src: string;
  alt: string;
  /** Bold overlay headline, bottom-left of the image. */
  title: string;
  /** Overlay subtitle, under the title. */
  subtitle: string;
}

export interface AuthFormShellProps {
  heading: string;
  /** Rendered under the heading. Use for the "No account? Sign up" line. */
  subheading?: ReactNode;
  /**
   * One slide for a static image, more than one for a rotating carousel
   * (5s interval, crossfade) - marketing's role picker uses several since it
   * speaks for every role at once; a single role app only ever needs one.
   */
  images: readonly AuthImageSlide[];
  apiError?: string | null;
  /*
   * Set together to render the "verify now" recovery banner instead of a
   * dead-end error, when login or signup failed because the account exists
   * but has not verified its email yet.
   */
  unverifiedEmail?: string | null;
  onVerifyEmail?: () => void;
  children: ReactNode;
}

const SLIDE_INTERVAL_MS = 5000;

export function AuthFormShell({
  heading,
  subheading,
  images,
  apiError,
  unverifiedEmail,
  onVerifyEmail,
  children,
}: AuthFormShellProps) {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const isCarousel = images.length > 1;

  useEffect(() => {
    if (!isCarousel) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isCarousel, images.length]);

  const slide = images[activeSlide] ?? images[0];

  return (
    /*
     * h-screen + overflow-hidden here, deliberately: this is the one place
     * that hands scrolling to exactly one child below, not the accidental
     * kind (see IntroAnimation's body-lock). The image panel never needs to
     * scroll; the form panel is the only one that can outgrow the viewport.
     */
    <div className="flex h-screen w-full overflow-hidden">
      {/* Image panel - fixed at 100vh, stays put while the form scrolls */}
      <div className="relative hidden h-screen overflow-hidden lg:block lg:w-1/2">
        <AnimatePresence mode="sync">
          {slide && (
            <motion.img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionSlow}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </AnimatePresence>

        {/* Brand gradient scrim - primary green, not a generic black wash */}
        <div className="from-primary/90 via-primary/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent" />

        {/* Logo */}
        <Link
          to="/"
          className="absolute top-10 left-10 flex items-center gap-2"
        >
          <AppLogo variant="white" />
        </Link>

        {/* Overlay copy + slide dots */}
        <div className="absolute right-10 bottom-12 left-10">
          <AnimatePresence mode="wait">
            {slide && (
              <motion.div
                key={slide.title}
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transitionBase}
              >
                {/* Amber accent - the one spot of the secondary brand colour
                    on an otherwise green-and-white panel. */}
                <div className="bg-secondary mb-3 h-1 w-12 rounded-full" />
                <h2 className="font-syne mb-2 text-3xl font-bold text-white lg:text-4xl">
                  {slide.title}
                </h2>
                <p className="text-lg text-white/75">{slide.subtitle}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {isCarousel && (
            <div className="mt-6 flex items-center gap-2">
              {images.map((option, index) => (
                <button
                  key={option.src}
                  type="button"
                  aria-label={`Show ${option.title}`}
                  onClick={() => setActiveSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeSlide
                      ? "w-8 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
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

            {onVerifyEmail && (
              <VerifyEmailBanner
                email={unverifiedEmail}
                onVerify={onVerifyEmail}
              />
            )}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
