import React from "react";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { fadeDownVariants, transitionBase } from "../lib/motion/variants";

/*
 * The page-level success/error banner.
 *
 * Every dashboard page had grown its own: same layout, same motion, but each
 * reaching for raw palette classes (bg-green-50, text-red-900) that drift from
 * the status tokens the tables and badges already use. One component keeps the
 * two in step, and keeps a page from inventing a seventh shade of green.
 *
 * For per-field validation use the input's own `error` slot instead. This is
 * for outcomes that belong to the page, not to one control.
 */

export type AlertTone = "success" | "danger" | "warning" | "info";

interface ToneStyle {
  container: string;
  icon: string;
  title: string;
  description: string;
  defaultIcon: LucideIcon;
}

/* Borders are the foreground token at low alpha: the token set has no separate
   border ramp, and a solid status colour reads as a hard rule at this size. */
const toneStyles: Record<AlertTone, ToneStyle> = {
  success: {
    container: "bg-status-delivered border-status-delivered-fg/20",
    icon: "text-status-delivered-fg",
    title: "text-status-delivered-fg",
    description: "text-status-delivered-fg/80",
    defaultIcon: CheckCircle,
  },
  danger: {
    container: "bg-status-cancelled border-status-cancelled-fg/20",
    icon: "text-status-cancelled-fg",
    title: "text-status-cancelled-fg",
    description: "text-status-cancelled-fg/80",
    defaultIcon: AlertCircle,
  },
  warning: {
    container: "bg-status-pending border-status-pending-fg/20",
    icon: "text-status-pending-fg",
    title: "text-status-pending-fg",
    description: "text-status-pending-fg/80",
    defaultIcon: AlertTriangle,
  },
  info: {
    container: "bg-status-on-the-way border-status-on-the-way-fg/20",
    icon: "text-status-on-the-way-fg",
    title: "text-status-on-the-way-fg",
    description: "text-status-on-the-way-fg/80",
    defaultIcon: Info,
  },
};

export interface AlertBannerProps {
  tone?: AlertTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Overrides the tone's default icon. */
  icon?: LucideIcon;
  /** Renders a dismiss control. Omit for a banner the page clears itself. */
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  tone = "info",
  title,
  description,
  icon,
  onDismiss,
  className,
}: AlertBannerProps) {
  const style = toneStyles[tone];
  const Icon = icon ?? style.defaultIcon;

  return (
    <motion.div
      variants={fadeDownVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitionBase}
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        style.container,
        className,
      )}
    >
      <Icon size={20} className={cn("mt-0.5 shrink-0", style.icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("font-semibold", style.title)}>{title}</p>
        {description && (
          <p className={cn("text-sm", style.description)}>{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className={cn(
            "shrink-0 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-black/5",
            style.icon,
          )}
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}

AlertBanner.displayName = "AlertBanner";
