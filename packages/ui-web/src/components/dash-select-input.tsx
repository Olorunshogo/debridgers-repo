import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search, Landmark } from "lucide-react";
import { BaseInputField } from "./base-input-field";
import {
  selectMenuVariants,
  selectMenuTransition,
} from "../lib/motion/variants";
/* Canonical shape lives in types/location and is exported from the package root. */
import type { SelectOption } from "../types/location";

export interface DashSelectInputProps {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /*
   * Fires alongside `onChange` with the whole option, not just its value.
   *
   * Bank selection needs both halves: the code is what a transfer uses, the name
   * is what gets stored and displayed. Without this a caller has to re-find the
   * option by value at every call site.
   */
  onSelectOption?: (option: SelectOption) => void;
  /*
   * Bank mode. Off by default; the component is an ordinary select.
   *
   * On, it renders a bank glyph per row and turns on the search box, because a
   * real bank list runs to a couple of hundred entries and scrolling that is
   * not a reasonable way to find "Wema".
   */
  isBank?: boolean;
  /*
   * Forces the search box on for a long non-bank list. Bank mode enables it
   * regardless.
   */
  searchable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  /* Compact contexts such as a filter bar. See BaseInputField. */
  hideLabel?: boolean;
}

export function DashSelectInput({
  label,
  options,
  placeholder,
  error,
  value,
  defaultValue,
  onChange,
  onSelectOption,
  isBank = false,
  searchable = false,
  id,
  name,
  className = "",
  required,
  disabled,
  hideLabel = false,
}: DashSelectInputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
  const isControlled = value !== undefined;

  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? "",
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  /* Which row the keyboard is on. Separate from the selected value. */
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentValue = isControlled ? value : internalValue;
  const selectedLabel =
    options.find((o) => o.value === currentValue)?.label ?? null;

  const showSearch = isBank || searchable;

  const filtered = useMemo<SelectOption[]>(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, showSearch]);

  // === Close on outside click

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /*
   * Focus the search box once the menu has actually rendered, and clear the
   * transient menu state on close.
   *
   * The highlighted row is deliberately NOT set here: it is set by whichever
   * handler opened the menu. Deriving it from `filtered` in an effect would
   * re-run on every keystroke and fight the search box, which moves the
   * highlight to the first match.
   */
  useEffect(() => {
    if (isOpen) {
      if (showSearch) searchRef.current?.focus();
      return;
    }
    setQuery("");
    setActiveIndex(-1);
  }, [isOpen, showSearch]);

  /* Keep the highlighted row in view when arrowing past the visible window. */
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const row = listRef.current.querySelectorAll("[data-option]")[activeIndex];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (!isControlled) setInternalValue(option.value);
      setIsOpen(false);

      onSelectOption?.(option);

      if (onChange) {
        /* Synthesise a ChangeEvent<HTMLSelectElement> so call sites need no changes. */
        const nativeSelect = document.createElement("select");
        nativeSelect.name = name ?? inputId;
        Object.defineProperty(nativeSelect, "value", { value: option.value });
        const syntheticEvent = {
          target: nativeSelect,
          currentTarget: nativeSelect,
          bubbles: true,
          cancelable: false,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: true,
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: new Event("change"),
          type: "change",
          timeStamp: Date.now(),
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          persist: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    },
    [isControlled, onChange, onSelectOption, name, inputId],
  );

  // === Open / close

  /* Opens with the current selection highlighted, so arrowing starts from it. */
  const openMenu = useCallback(() => {
    setActiveIndex(options.findIndex((o) => o.value === currentValue));
    setIsOpen(true);
  }, [options, currentValue]);

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
    <BaseInputField
      label={label}
      error={error}
      required={required}
      className={className}
      inputId={inputId}
      hideLabel={hideLabel}
    >
      <div ref={wrapperRef} className="relative">
        {/* Trigger */}
        <button
          type="button"
          id={inputId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={toggleMenu}
          onKeyDown={handleKeyDown}
          className={`bg-input-bg text-heading font-syne flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-full border p-4 text-sm transition-all duration-300 ease-in-out outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-input-error-red"
              : isOpen
                ? "border-input-border-focus"
                : "border-input-border"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {isBank && selectedLabel && (
              <Landmark size={15} className="text-primary shrink-0" />
            )}
            <span
              className={`truncate text-left ${selectedLabel ? "text-heading" : "text-text-placeholder"}`}
            >
              {selectedLabel ?? placeholder ?? `Select ${label}`}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-icon-secondary pointer-events-none shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        {/* Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={selectMenuVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={selectMenuTransition}
              role="listbox"
              aria-label={label}
              className="border-gray-border absolute top-[calc(100%+4px)] left-0 z-50 flex w-full origin-top flex-col overflow-hidden rounded-2xl border bg-white shadow-lg"
            >
              {showSearch && (
                <div className="border-gray-border flex items-center gap-2 border-b px-3 py-2">
                  <Search size={15} className="text-icon-secondary shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={isBank ? "Search banks" : "Search"}
                    className="text-heading placeholder:text-text-placeholder w-full bg-transparent text-sm outline-none"
                  />
                </div>
              )}

              <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="text-text px-4 py-3 text-sm">
                    {isBank ? "No bank matches that." : "No matches."}
                  </p>
                ) : (
                  filtered.map((opt, i) => {
                    const isSelected = opt.value === currentValue;
                    const isActive = i === activeIndex;
                    return (
                      <div
                        key={opt.value}
                        data-option
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors duration-150 ease-in-out ${
                          isSelected
                            ? "bg-dash-quick-action-hover text-primary font-semibold"
                            : isActive
                              ? "bg-bg-light text-heading font-normal"
                              : "text-heading font-normal"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {isBank && (
                            <Landmark
                              size={14}
                              className="text-icon-secondary shrink-0"
                            />
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {isSelected && (
                          <Check size={15} className="text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BaseInputField>
  );
}

DashSelectInput.displayName = "DashSelectInput";
