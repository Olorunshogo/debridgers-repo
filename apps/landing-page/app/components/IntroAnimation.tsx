"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const WORD = "Debridgers";

// Exact order in which letters should appear (as you specified)
const REVEAL_ORDER = ["S", "R", "E", "R", "B", "E", "D"] as const;

const TOTAL_DURATION_MS = 6800;

export function IntroAnimation() {
  const [visible, setVisible] = useState(true);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(false);
      return;
    }

    let step = 0;

    const interval = setInterval(() => {
      if (step >= REVEAL_ORDER.length) {
        clearInterval(interval);
        return;
      }

      const letterToReveal = REVEAL_ORDER[step];

      // Find all positions in the word where this letter appears
      const newIndices: number[] = [];
      for (let i = 0; i < WORD.length; i++) {
        if (WORD[i].toUpperCase() === letterToReveal) {
          newIndices.push(i);
        }
      }

      setRevealedSet((prev) => {
        const updated = new Set(prev);
        newIndices.forEach((idx) => updated.add(idx));
        return updated;
      });

      step++;
    }, TOTAL_DURATION_MS / REVEAL_ORDER.length);

    const exitTimer = setTimeout(() => {
      setVisible(false);
    }, TOTAL_DURATION_MS + 600);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
    };
  }, [prefersReducedMotion]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.75, ease: "easeInOut" }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      >
        <div className="flex h-[160px] items-center justify-center overflow-hidden px-4">
          <div className="font-syne flex font-bold tracking-[-4px] text-emerald-700">
            {WORD.split("").map((char, index) => {
              const isRevealed = revealedSet.has(index);

              return (
                <motion.span
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 90,
                    scale: 0.3,
                    filter: "blur(12px)",
                  }}
                  animate={{
                    opacity: isRevealed ? 1 : 0.08,
                    y: isRevealed ? 0 : 90,
                    scale: isRevealed ? 1 : 0.65,
                    filter: isRevealed ? "blur(0px)" : "blur(10px)",
                  }}
                  transition={{
                    duration: 0.68,
                    ease: [0.215, 0.61, 0.355, 1],
                  }}
                  className="inline-block text-[92px] sm:text-[118px] lg:text-[138px]"
                >
                  {char}
                </motion.span>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-10 w-96 max-w-[380px]">
          <div className="h-0.5 overflow-hidden rounded-full bg-emerald-100">
            <motion.div
              className="h-full rounded-full bg-emerald-600"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: TOTAL_DURATION_MS / 1000,
                ease: "linear",
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
