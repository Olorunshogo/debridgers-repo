import React from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

/*
 * A standing obligation in the topbar.
 *
 * Deliberately not a toast. Toasts are transient by construction: one that
 * never leaves covers content and trains people to dismiss it without reading,
 * which is the one outcome an unmet obligation cannot afford. This sits inline,
 * never covers anything, and has no dismiss control at all - there is nothing
 * to dismiss, because it is a rendering of server state rather than a
 * notification about it. It disappears when the underlying condition clears.
 *
 * The label collapses to the icon alone on narrow viewports, where the topbar
 * has no room for prose.
 */

export interface ActionRequiredChipProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  /** Accessible description of what acting on this will do. */
  title?: string;
  className?: string;
}

export function ActionRequiredChip({
  label,
  onClick,
  icon: Icon = AlertTriangle,
  title,
  className,
}: ActionRequiredChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label}
      className={cn(
        "bg-status-pending text-status-pending-fg border-status-pending-fg/25 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease-in-out hover:opacity-80",
        className,
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

ActionRequiredChip.displayName = "ActionRequiredChip";
