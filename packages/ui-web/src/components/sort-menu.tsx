import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { selectMenuVariants, selectMenuTransition } from "../lib/motion";
import {
  PRODUCT_SORT_OPTIONS,
  type ProductSortKey,
} from "../utils/sort-products";

/*
 * Self-contained, unlike NotificationDropdown: the shop pages have no topbar
 * already tracking open/close state for this, so the toggle and the
 * outside-click guard live here rather than being threaded through a caller.
 */

export interface SortMenuProps {
  value: ProductSortKey;
  onChange: (value: ProductSortKey) => void;
  /** Which edge to pin the panel to. */
  align?: "left" | "right";
  className?: string;
}

export function SortMenu({
  value,
  onChange,
  align = "right",
  className,
}: SortMenuProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  const activeLabel = PRODUCT_SORT_OPTIONS.find(
    (opt) => opt.value === value,
  )?.label;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="border-line text-heading flex cursor-pointer items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5"
      >
        <ArrowUpDown size={14} />
        <span className="hidden sm:inline">Sort: {activeLabel}</span>
        <span className="sm:hidden">Sort</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={selectMenuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={selectMenuTransition}
            role="listbox"
            aria-label="Sort products"
            className={cn(
              "border-line absolute top-[calc(100%+8px)] z-50 flex w-52 origin-top flex-col overflow-hidden rounded-2xl border bg-white py-1 shadow-lg",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {PRODUCT_SORT_OPTIONS.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-black/5",
                    active
                      ? "text-primary font-semibold"
                      : "text-heading font-medium",
                  )}
                >
                  {option.label}
                  {active && <Check size={14} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

SortMenu.displayName = "SortMenu";
