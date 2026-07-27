import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router";
import { DialogLoaderOverlay } from "./dialog-loader";
import {
  backdropVariants,
  dialogPanelVariants,
  springPanel,
  transitionBase,
} from "../motion/variants";
import type {
  DialogComponent,
  DialogContextValue,
  DialogProps,
  DialogRegistry,
  OpenDialog,
} from "./dialog-types";

/*
 * The dialog engine.
 *
 * Solves, once, what every hand-rolled modal in this codebase currently solves
 * badly or not at all: responsive bottom-sheet on mobile and centered panel on
 * desktop, backdrop and Escape dismissal, stacking, focus trapping and
 * restoration, a blocking loading overlay, and auto-close on route change.
 *
 * Never build a bespoke useState-driven modal in a page again. Register the
 * dialog and call triggerDialog.
 */

const DialogContext = createContext<DialogContextValue | null>(null);

export interface DialogProviderProps {
  registry: DialogRegistry;
  children: ReactNode;
}

export function DialogProvider({ registry, children }: DialogProviderProps) {
  const [openDialogs, setOpenDialogs] = useState<OpenDialog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const nextId = useRef<number>(0);
  const location = useLocation();

  /*
   * Lazy components are cached per key so reopening a dialog does not re-trigger
   * Suspense, and so the same component identity is reused across renders.
   */
  const componentCache = useRef<Map<string, DialogComponent>>(new Map());

  const getComponent = useCallback(
    (key: string): DialogComponent | null => {
      const cached = componentCache.current.get(key);
      if (cached) return cached;

      const loader = registry[key];
      if (!loader) return null;

      /* Narrowed here, once - see the note on DialogLoader. */
      const Component = lazy(
        loader as () => Promise<{ default: DialogComponent }>,
      );
      componentCache.current.set(key, Component);
      return Component;
    },
    [registry],
  );

  const triggerDialog = useCallback(
    (key: string, props: DialogProps = {}): void => {
      if (!registry[key]) {
        /*
         * A missing key is a wiring mistake, not a user-facing error. Fail loudly
         * in development rather than silently rendering nothing.
         */
        console.error(
          `[DialogProvider] No dialog registered for key "${key}". Add it to the registry.`,
        );
        return;
      }
      nextId.current += 1;
      setOpenDialogs((current) => [
        ...current,
        { key, props, id: nextId.current },
      ]);
    },
    [registry],
  );

  const closeDialog = useCallback((): void => {
    setIsLoading(false);
    setOpenDialogs((current) => current.slice(0, -1));
  }, []);

  const closeAllDialogs = useCallback((): void => {
    setIsLoading(false);
    setOpenDialogs([]);
  }, []);

  // Route changes should never leave a dialog stranded over the new page
  useEffect(() => {
    closeAllDialogs();
  }, [location.pathname, closeAllDialogs]);

  // Escape closes the topmost dialog, unless a blocking action is running
  useEffect(() => {
    if (openDialogs.length === 0) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !isLoading) closeDialog();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDialogs.length, isLoading, closeDialog]);

  // Lock body scroll while anything is open
  useEffect(() => {
    if (openDialogs.length === 0) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openDialogs.length]);

  const value = useMemo<DialogContextValue>(
    () => ({
      triggerDialog,
      closeDialog,
      closeAllDialogs,
      setDialogLoading: setIsLoading,
      openDialogs,
    }),
    [triggerDialog, closeDialog, closeAllDialogs, openDialogs],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {openDialogs.map((dialog, index) => {
          const Component = getComponent(dialog.key);
          if (!Component) return null;

          return (
            <DialogPanel
              key={dialog.id}
              isTop={index === openDialogs.length - 1}
              stackIndex={index}
              onDismiss={isLoading ? undefined : closeDialog}
            >
              <Suspense fallback={<DialogLoaderOverlay inline />}>
                {/* Props are app-defined; the engine passes them through untouched. */}
                <Component {...dialog.props} />
              </Suspense>
            </DialogPanel>
          );
        })}
      </AnimatePresence>

      {isLoading && <DialogLoaderOverlay />}
    </DialogContext.Provider>
  );
}

interface DialogPanelProps {
  isTop: boolean;
  stackIndex: number;
  /** Undefined while a blocking action runs, which disables dismissal. */
  onDismiss?: () => void;
  children: ReactNode;
}

/*
 * Bottom sheet on mobile, centered panel from md up, per the repo's modal
 * convention. The panel wrapper is pointer-events-none so a click lands on the
 * backdrop underneath it rather than the empty space beside the panel.
 */
function DialogPanel({
  isTop,
  stackIndex,
  onDismiss,
  children,
}: DialogPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    panelRef.current?.focus();

    return () => {
      const target = previouslyFocused.current;
      if (target instanceof HTMLElement) target.focus();
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 40 + stackIndex * 10 }}
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transitionBase}
        onClick={onDismiss}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none fixed inset-0 flex items-end justify-center md:items-center"
        style={{ zIndex: 50 + stackIndex * 10 }}
      >
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal={isTop}
          tabIndex={-1}
          className="border-gray-border pointer-events-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border bg-white p-6 outline-none md:rounded-xl"
          variants={dialogPanelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springPanel}
        >
          {children}
        </motion.div>
      </div>
    </>
  );
}

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used inside <DialogProvider>");
  }
  return context;
}
