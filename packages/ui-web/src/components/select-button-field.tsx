import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search } from "lucide-react";
import {
  selectMenuVariants,
  selectMenuUpVariants,
  selectMenuTransition,
} from "../lib/motion/variants";
/* Canonical shape lives in types/location and is exported from the package root. */
import type { SelectOption } from "../types/location";

/*
 * The compact sibling of SelectInputField.
 *
 * Same trigger-plus-absolute-menu pattern, but a button rather than a form
 * field: no BaseInputField wrapper, no label above it, and onChange hands back
 * the value instead of a synthesised ChangeEvent<HTMLSelectElement>. That event
 * shape exists so SelectInputField can drop into a form; a toolbar filter or a
 * rows-per-page control has no form to satisfy and had to unwrap it again at
 * every call site.
 *
 * Use this in toolbars, filter bars and table footers. Use SelectInputField
 * inside forms, where the label and error slot matter.
 */

export type SelectButtonFieldSize = "sm" | "md";
export type SelectButtonFieldAlign = "left" | "right";

export interface SelectButtonFieldProps {
  /*
   * Names the control for screen readers, and is the prefix when
   * showInlineLabel is on. Never rendered as a field label above the trigger.
   */
  label: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Renders "Label: Value" in the trigger, for a filter bar that needs context. */
  showInlineLabel?: boolean;
  /** Shown when nothing is selected. Defaults to the label. */
  placeholder?: string;
  searchable?: boolean;
  /** sm for table footers and dense toolbars, md for filter bars. */
  size?: SelectButtonFieldSize;
  /*
   * Which edge the menu is pinned to. A right-aligned control near the viewport
   * edge needs "right", or the menu opens off screen.
   */
  align?: SelectButtonFieldAlign;
  disabled?: boolean;
  className?: string;
  /** Escape hatch for the trigger only, e.g. a bespoke width. */
  triggerClassName?: string;
}

const sizeClasses: Record<SelectButtonFieldSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-11 gap-2 px-4 text-sm",
};

// === Menu placement

/*
 * The menu is portalled to <body> and positioned with `fixed`, rather than
 * living beside the trigger as an absolute child.
 *
 * An absolute menu is clipped by any ancestor with `overflow-hidden`, and the
 * table card is exactly that (DataTable's root). The footer's rows-per-page
 * menu was cut off at the card border no matter which way it opened, so
 * flipping alone would not have fixed it: with the footer mid-screen the
 * viewport reports plenty of room below, the menu opens down, and the card
 * clips it anyway. Portalling to <body> removes every clipping ancestor, which
 * is also what makes measuring against the viewport the true answer.
 */

/** Distance between trigger and menu. */
const MENU_GAP = 4;
/** Keeps a flipped menu off the screen edge. */
const VIEWPORT_MARGIN = 8;
/** Search row, `max-h-64` list and its padding, when every row is rendered. */
const MENU_MAX_HEIGHT = 320;

const OPTION_HEIGHT = 40;
const SEARCH_ROW_HEIGHT = 37;
const LIST_PADDING = 8;

type MenuPlacement = "up" | "down";

/*
 * `top` and `bottom` are one vertical anchor or the other: a downward menu
 * grows from the trigger's bottom edge, an upward one from its top, so each
 * pins the edge it grows away from.
 */
interface MenuPosition {
  placement: MenuPlacement;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  maxHeight: number;
}

/*
 * Picks the side with room. Down is preferred and only given up when it cannot
 * hold the menu; if neither side can, the roomier one wins and `maxHeight`
 * caps the menu so the list scrolls instead of running off screen.
 */
function computeMenuPosition(
  trigger: HTMLElement,
  align: SelectButtonFieldAlign,
  desiredHeight: number,
): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow =
    window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;

  const placement: MenuPlacement =
    spaceBelow >= desiredHeight || spaceBelow >= spaceAbove ? "down" : "up";

  const available = placement === "down" ? spaceBelow : spaceAbove;

  return {
    placement,
    top: placement === "down" ? rect.bottom + MENU_GAP : undefined,
    bottom:
      placement === "up" ? window.innerHeight - rect.top + MENU_GAP : undefined,
    left: align === "left" ? rect.left : undefined,
    right: align === "right" ? window.innerWidth - rect.right : undefined,
    minWidth: rect.width,
    maxHeight: Math.max(0, Math.min(desiredHeight, available)),
  };
}

/*
 * Height the menu wants before it exists to be measured, so the first paint
 * lands on the right side. A layout effect corrects it from the real element
 * once mounted, which matters when a caller restyles the rows.
 */
function estimateMenuHeight(optionCount: number, searchable: boolean): number {
  const rows = Math.max(optionCount, 1) * OPTION_HEIGHT + LIST_PADDING;
  const total = rows + (searchable ? SEARCH_ROW_HEIGHT : 0);
  return Math.min(total, MENU_MAX_HEIGHT);
}

export function SelectButtonField({
  label,
  options,
  value,
  onChange,
  showInlineLabel = false,
  placeholder,
  searchable = false,
  size = "md",
  align = "left",
  disabled = false,
  className = "",
  triggerClassName = "",
}: SelectButtonFieldProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  /* Which row the keyboard is on. Separate from the selected value. */
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const [position, setPosition] = useState<MenuPosition | null>(null);
  /* The portal target only exists on the client, and this package renders on
     the server too. */
  const [mounted, setMounted] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /* The menu is portalled out of the wrapper, so outside-click has to test it
     separately. */
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  const filtered = useMemo<readonly SelectOption[]>(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  // === Close on outside click

  /*
   * Both the wrapper and the portalled menu count as "inside". Testing the
   * wrapper alone would close the menu on the mousedown that precedes a click
   * on an option, unmounting the row before its click could land, and
   * selection would silently stop working.
   */
  useEffect(() => {
    function handleOutside(e: MouseEvent): void {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const reposition = useCallback(
    (measuredHeight?: number): void => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const desired =
        measuredHeight ?? estimateMenuHeight(filtered.length, searchable);
      setPosition(computeMenuPosition(trigger, align, desired));
    },
    [align, filtered.length, searchable],
  );

  /*
   * Correct the estimate against the rendered menu, and keep the menu glued to
   * its trigger while the page moves under it. Scroll is captured so ancestor
   * scroll containers count, not just the window.
   */
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const menu = menuRef.current;
    reposition(menu ? menu.scrollHeight : undefined);

    function handleViewportChange(): void {
      reposition(menuRef.current?.scrollHeight);
    }

    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [isOpen, reposition]);

  /* Focus the search box once the menu has rendered, and clear transient state
     on close. The highlighted row is set by whoever opened the menu, not here:
     deriving it from `filtered` would re-run per keystroke and fight the search. */
  useEffect(() => {
    if (isOpen) {
      if (searchable) searchRef.current?.focus();
      return;
    }
    setQuery("");
    setActiveIndex(-1);
  }, [isOpen, searchable]);

  /* Keep the highlighted row in view when arrowing past the visible window. */
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const row = listRef.current.querySelectorAll("[data-option]")[activeIndex];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = useCallback(
    (option: SelectOption): void => {
      onChange(option.value);
      setIsOpen(false);
    },
    [onChange],
  );

  /*
   * Opens with the current selection highlighted, so arrowing starts from it.
   * Placement is seeded here rather than in an effect so the menu is already on
   * the correct side of the trigger on its first paint, with no visible jump.
   */
  const openMenu = useCallback((): void => {
    setActiveIndex(options.findIndex((o) => o.value === value));
    reposition();
    setIsOpen(true);
  }, [options, value, reposition]);

  function toggleMenu(): void {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    openMenu();
  }

  // === Keyboard

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1 >= filtered.length ? 0 : i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[activeIndex];
      if (option) handleSelect(option);
      return;
    }
    if (e.key === "Tab") setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        className={`bg-input-bg text-heading font-syne flex cursor-pointer items-center justify-between rounded-full border transition-all duration-300 ease-in-out outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
          sizeClasses[size]
        } ${
          isOpen ? "border-input-border-focus" : "border-input-border"
        } ${triggerClassName}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {showInlineLabel && (
            <span className="text-body shrink-0">{label}:</span>
          )}
          <span
            className={`truncate text-left ${selectedLabel ? "text-heading font-medium" : "text-placeholder-text"}`}
          >
            {selectedLabel ?? placeholder ?? label}
          </span>
        </span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          className={`text-icon-secondary pointer-events-none shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      {/* Menu, portalled clear of the table card's overflow-hidden */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && position && (
              <motion.div
                ref={menuRef}
                variants={
                  position.placement === "up"
                    ? selectMenuUpVariants
                    : selectMenuVariants
                }
                initial="initial"
                animate="animate"
                exit="exit"
                transition={selectMenuTransition}
                role="listbox"
                aria-label={label}
                style={{
                  position: "fixed",
                  top: position.top,
                  bottom: position.bottom,
                  left: position.left,
                  right: position.right,
                  minWidth: position.minWidth,
                  maxHeight: position.maxHeight,
                }}
                className={`border-line z-50 flex flex-col overflow-hidden rounded-2xl border bg-white shadow-lg ${
                  position.placement === "up" ? "origin-bottom" : "origin-top"
                }`}
              >
                {searchable && (
                  <div className="border-line flex items-center gap-2 border-b px-3 py-2">
                    <Search
                      size={15}
                      className="text-icon-secondary shrink-0"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Search"
                      className="text-heading placeholder:text-placeholder-text w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                )}

                {/* min-h-0 so the flex child may shrink under the menu's cap. */}
                <div
                  ref={listRef}
                  className="min-h-0 flex-1 overflow-y-auto py-1"
                >
                  {filtered.length === 0 ? (
                    <p className="text-body px-4 py-3 text-sm">No matches.</p>
                  ) : (
                    filtered.map((opt, i) => {
                      const isSelected = opt.value === value;
                      const isActive = i === activeIndex;
                      return (
                        <div
                          key={opt.value}
                          data-option
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(opt)}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors duration-150 ease-in-out ${
                            isSelected
                              ? "bg-dash-quick-action-hover text-primary font-semibold"
                              : isActive
                                ? "bg-light-bg text-heading font-normal"
                                : "text-heading font-normal"
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && (
                            <Check
                              size={15}
                              className="text-primary shrink-0"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

SelectButtonField.displayName = "SelectButtonField";
