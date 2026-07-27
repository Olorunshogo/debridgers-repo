import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DialogHeader } from "../../lib/dialog/dialog-header";
import { DialogErrorBanner } from "../../lib/dialog/dialog-error-banner";
import {
  swappedContentVariants,
  swappedContentTransition,
} from "../../lib/motion/variants";

/*
 * Log-in / sign-up shell for use inside the dialog engine, e.g. the auth gate
 * at checkout.
 *
 * Presentation only: it renders the header, the tab strip and whichever child
 * the consumer supplies for the active tab. It does not own the forms, so the
 * consumer can drive them with the shared useLogin / useSignup hooks rather than
 * this component reimplementing either.
 */

export type AuthTab = "login" | "signup";

export interface AuthTabPanelProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  title?: string;
  description?: string;
  apiError?: string | null;
  onClose: () => void;
  /** The form for the active tab. */
  children: ReactNode;
}

const TABS: readonly { value: AuthTab; label: string }[] = [
  { value: "login", label: "Log in" },
  { value: "signup", label: "Sign up" },
];

export function AuthTabPanel({
  activeTab,
  onTabChange,
  title = "Log in to continue",
  description = "You need an account to complete your order.",
  apiError,
  onClose,
  children,
}: AuthTabPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <DialogHeader title={title} description={description} onClose={onClose} />

      <div
        role="tablist"
        aria-label="Log in or sign up"
        className="flex gap-1 rounded-xl bg-gray-100 p-1"
      >
        {TABS.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.value)}
              /* Active option does nothing on click, so it gets cursor-default. */
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "text-heading cursor-default bg-white shadow-sm"
                  : "text-text cursor-pointer"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <DialogErrorBanner message={apiError} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={swappedContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={swappedContentTransition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
