import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// === Timing constants (ms) — total = 8000ms (phase 5 removed)
const PHASE_DURATIONS = {
  1: 2000, // letter slide-in
  2: 1500, // letter slide-out
  3: 2000, // split entry + image drop together
  4: 1000, // hold before exit
  done: 500, // overlay fade-out
} as const;

const TOTAL_DURATION_MS = 7000;
const LETTER_STAGGER_IN = 0.18;
const LETTER_STAGGER_OUT = 0.15;

const LETTERS = "Debridgers ".split("");
const SPLIT_LEFT = "Debri"; // Debri
const SPLIT_RIGHT = "dgers"; // dgers

type Phase = 1 | 2 | 3 | 4 | "done";

// === Phase 1: Letters slide in left-to-right
function LetterSlideIn() {
  return (
    <div className="flex items-center justify-center">
      {LETTERS.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            delay: i * LETTER_STAGGER_IN,
          }}
          className="font-syne text-primary text-4xl font-bold sm:text-5xl lg:text-6xl"
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}

// === Phase 2: Letters slide out right, reverse order
function LetterSlideOut() {
  return (
    <div className="flex items-center justify-center">
      {LETTERS.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: 120, opacity: 0 }}
          transition={{
            duration: 0.35,
            ease: "easeIn",
            delay: (LETTERS.length - 1 - i) * LETTER_STAGGER_OUT,
          }}
          className="font-syne text-primary text-4xl font-bold sm:text-5xl lg:text-6xl"
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}

// === Phase 3: Split entry + image drops onto the "i"
// We measure the "i" ref position relative to the container to land precisely

// === Tuning knobs — adjust these to reposition the dropped image ===
// DOT_TOP_OFFSET: px offset from top of "i" bounding box. 0 = top of letter (dot area). Positive = move down.
const DOT_TOP_OFFSET = -8;
// DOT_HEIGHT_RATIO: image height as a fraction of the "i" letter height. 0.39 ≈ just the dot region.
const DOT_HEIGHT_RATIO = 0.39;
// DOT_WIDTH_RATIO: image width as a multiple of the "i" letter width. 2.2 = wider than the stem.
const DOT_WIDTH_RATIO = 2.2;
// DOT_HORIZONTAL_OFFSET: shifts image left (negative) or right (positive) as a multiple of "i" width.
const DOT_HORIZONTAL_OFFSET = -0.6;

function SplitEntryWithDrop() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLSpanElement>(null);
  const [iPos, setIPos] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current || !iRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const iRect = iRef.current.getBoundingClientRect();
      setIPos({
        left:
          iRect.left - containerRect.left + iRect.width * DOT_HORIZONTAL_OFFSET,
        top: iRect.top - containerRect.top + DOT_TOP_OFFSET,
        width: iRect.width * DOT_WIDTH_RATIO,
        height: iRect.height * DOT_HEIGHT_RATIO,
      });
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
    >
      {/* "Debri" slides in from left */}
      <motion.span
        initial={{ x: "-60vw", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className="font-syne text-primary text-5xl font-bold sm:text-6xl lg:text-7xl"
      >
        {/* Render each char, put ref on the "i" (last char of SPLIT_LEFT) */}
        {SPLIT_LEFT.split("").map((char, idx) =>
          idx === SPLIT_LEFT.length - 1 ? (
            <span key={idx} ref={iRef} className="relative inline-block">
              {char}
            </span>
          ) : (
            <span key={idx}>{char}</span>
          ),
        )}
      </motion.span>

      {/* "dgers" slides in from right */}
      <motion.span
        initial={{ x: "60vw", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className="font-syne text-primary text-5xl font-bold sm:text-6xl lg:text-7xl"
      >
        {SPLIT_RIGHT}
      </motion.span>

      {/* Image drops from above onto the exact "i" position */}
      {iPos && (
        <motion.img
          src="/logos/cropped-i-transparent.png"
          alt=""
          aria-hidden
          initial={{ y: -160, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.55,
            ease: [0.34, 1.3, 0.64, 1], // bouncy spring feel
          }}
          className="pointer-events-none absolute"
          style={{
            left: iPos.left,
            top: iPos.top,
            width: iPos.width,
            height: iPos.height,
          }}
        />
      )}
    </div>
  );
}

// === Progress bar: fills linearly over TOTAL_DURATION_MS
function ProgressBar() {
  return (
    <div className="bg-primary/15 mt-8 h-[3px] w-full max-w-[400px] overflow-hidden rounded-full">
      <motion.div
        className="bg-primary h-full rounded-full"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: TOTAL_DURATION_MS / 1000, ease: "linear" }}
      />
    </div>
  );
}

// === Main IntroAnimation component
export function IntroAnimation() {
  const [phase, setPhase] = useState<Phase>(1);
  const [visible, setVisible] = useState(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(false);
      return;
    }

    const t1 = setTimeout(() => setPhase(2), PHASE_DURATIONS[1]);
    const t2 = setTimeout(
      () => setPhase(3),
      PHASE_DURATIONS[1] + PHASE_DURATIONS[2],
    );
    const t3 = setTimeout(
      () => setPhase(4),
      PHASE_DURATIONS[1] + PHASE_DURATIONS[2] + PHASE_DURATIONS[3],
    );
    const t4 = setTimeout(
      () => setPhase("done"),
      PHASE_DURATIONS[1] +
        PHASE_DURATIONS[2] +
        PHASE_DURATIONS[3] +
        PHASE_DURATIONS[4],
    );
    const t5 = setTimeout(
      () => setVisible(false),
      TOTAL_DURATION_MS + PHASE_DURATIONS.done,
    );

    timersRef.current = [t1, t2, t3, t4, t5];
    return () => timersRef.current.forEach(clearTimeout);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: PHASE_DURATIONS.done / 1000,
            ease: "easeInOut",
          }}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white"
          style={{ pointerEvents: "all" }}
        >
          {/* Animation + progress bar grouped together */}
          <div className="flex flex-col items-center gap-0">
            {/* Text animation stage */}
            <div className="flex h-24 w-full items-center justify-center sm:h-28 lg:h-32">
              <AnimatePresence mode="wait">
                {phase === 1 && (
                  <motion.div key="phase1" exit={{ opacity: 0 }}>
                    <LetterSlideIn />
                  </motion.div>
                )}
                {phase === 2 && (
                  <motion.div key="phase2" exit={{ opacity: 0 }}>
                    <LetterSlideOut />
                  </motion.div>
                )}
                {(phase === 3 || phase === 4) && (
                  <motion.div key="split" exit={{ opacity: 0 }}>
                    <SplitEntryWithDrop />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            {/* <ProgressBar /> */}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
