import React from "react";
import { Clock, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

/*
 * A placeholder for work that is designed but not built.
 *
 * It exists to replace two habits that both lose information. The first is
 * commenting JSX out, which hides the intent along with the markup: six months
 * later nobody remembers whether the block was disabled deliberately or left
 * behind. The second is writing the same "this is coming, here is why" prose
 * inline on every unfinished page, which drifts between pages and gets stale.
 *
 * So the explanation lives in the component and the call site stays one line.
 *
 * `commented` is required rather than defaulted, which resolves a small
 * contradiction in the brief: a prop cannot be both non-optional and have a
 * default. Required wins, because the point is to force the decision at every
 * call site rather than inherit one. The shorthand `<ComingSoon commented />`
 * is the shortest thing to write and is also the hidden state, so the safe
 * option stays the lazy one.
 */

export type ComingSoonVariant = "pill" | "inline" | "page";

export interface ComingSoonProps {
  /**
   * Hides the component and everything inside it.
   *
   * This is the runtime equivalent of commenting the block out, except the
   * markup, the copy and the reason all survive in the tree. Flip to `false`
   * to reveal the placeholder; delete the wrapper entirely when the real
   * feature ships.
   */
  commented: boolean;
  /**
   * `pill` is a chip to sit beside a disabled control. `inline` is a card for a
   * section of an otherwise working page. `page` owns the whole screen.
   */
  variant?: ComingSoonVariant;
  label?: string;
  title?: string;
  description?: string;
  /** When it is expected, if that is honestly known. Omit rather than guess. */
  eta?: string;
  icon?: LucideIcon;
  /**
   * Detail shown below the description: what it will do, what it is waiting on,
   * how it was specced. Ignored by the `pill` variant, which has no room.
   */
  children?: React.ReactNode;
  className?: string;
}

export function ComingSoon({
  commented,
  variant = "inline",
  label = "Coming soon",
  title = "Coming soon",
  description = "This is designed and specced, but not built yet.",
  eta,
  icon: Icon = Clock,
  children,
  className,
}: ComingSoonProps) {
  /* The whole point of the component: one flag, nothing rendered, nothing lost. */
  if (commented) return null;

  if (variant === "pill") {
    return (
      <span
        title={description}
        className={cn(
          "bg-status-pending text-status-pending-fg border-status-pending-fg/25 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
          className,
        )}
      >
        <Icon size={14} className="shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  const isPage = variant === "page";

  return (
    <section
      className={cn(
        "border-line flex flex-col rounded-2xl border bg-white",
        isPage ? "gap-6 p-6 sm:p-8" : "gap-4 p-5",
        className,
      )}
    >
      <header className="flex flex-col gap-3">
        <span className="bg-status-pending text-status-pending-fg border-status-pending-fg/25 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold">
          <Icon size={14} className="shrink-0" />
          <span>{label}</span>
        </span>

        <div className="flex flex-col gap-1.5">
          <h2
            className={cn(
              "font-syne text-heading font-semibold",
              isPage ? "text-xl sm:text-2xl" : "text-base",
            )}
          >
            {title}
          </h2>
          <p className="text-body text-sm">{description}</p>
          {eta ? <p className="text-body/70 text-xs">Expected: {eta}</p> : null}
        </div>
      </header>

      {children ? (
        <div className="text-body flex flex-col gap-4 text-sm">{children}</div>
      ) : null}
    </section>
  );
}

ComingSoon.displayName = "ComingSoon";
