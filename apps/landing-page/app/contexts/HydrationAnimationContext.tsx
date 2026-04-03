import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface HydrationAnimationContextType {
  isHydrating: boolean;
  isInitialLoad: boolean;
  animationDuration: number;
  prefersReducedMotion: boolean;
}

const HydrationAnimationContext = createContext<
  HydrationAnimationContextType | undefined
>(undefined);

interface HydrationAnimationProviderProps {
  children: ReactNode;
  animationDuration?: number;
}

export function HydrationAnimationProvider({
  children,
  animationDuration = 8000, // 8 seconds
}: HydrationAnimationProviderProps) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // === Check if user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    // === Check if this is the initial load (first visit)
    const hasVisited = localStorage.getItem("debridgers_hydration_complete");
    const shouldShowAnimation = !hasVisited && !mediaQuery.matches;

    if (shouldShowAnimation) {
      setIsInitialLoad(true);
      // === Mark hydration as complete after animation duration
      const timer = setTimeout(() => {
        setIsHydrating(false);
        localStorage.setItem("debridgers_hydration_complete", "true");
      }, animationDuration + 500); // 500ms buffer

      return () => clearTimeout(timer);
    } else {
      // Skip animation if already visited or prefers reduced motion
      setIsHydrating(false);
      if (!hasVisited) {
        localStorage.setItem("debridgers_hydration_complete", "true");
      }
    }
  }, [animationDuration]);

  return (
    <HydrationAnimationContext.Provider
      value={{
        isHydrating,
        isInitialLoad,
        animationDuration,
        prefersReducedMotion,
      }}
    >
      {children}
    </HydrationAnimationContext.Provider>
  );
}

export function useHydrationAnimation() {
  const context = useContext(HydrationAnimationContext);
  if (!context) {
    throw new Error(
      "useHydrationAnimation must be used within HydrationAnimationProvider",
    );
  }
  return context;
}
