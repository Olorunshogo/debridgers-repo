import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useHydrationAnimation } from "../contexts/HydrationAnimationContext";

const FULL_TEXT = "Debridgers";
const SPLIT_LEFT = "Debr";
const SPLIT_RIGHT = "dgers";

interface LetterByLetterAnimationProps {
  duration: number;
  onComplete: () => void;
}

function LetterByLetterAnimation({
  duration,
  onComplete,
}: LetterByLetterAnimationProps) {
  const [visibleLetters, setVisibleLetters] = useState<string[]>([]);

  useEffect(() => {
    const letters = FULL_TEXT.split("");
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < letters.length) {
        setVisibleLetters((prev) => [...prev, letters[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 500); // === Small delay before moving to next stage
      }
    }, duration / letters.length);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  // return (
  //   <div className="font-syne text-primary flex items-center justify-center text-4xl font-semibold">
  //     {FULL_TEXT.split("").map((letter, index) => (
  //       <motion.span
  //         key={index}
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{
  //           opacity:
  //             visibleLetters.includes(letter) &&
  //             visibleLetters.indexOf(letter) === index
  //               ? 1
  //               : 0,
  //           y:
  //             visibleLetters.includes(letter) &&
  //             visibleLetters.indexOf(letter) === index
  //               ? 0
  //               : 20,
  //         }}
  //         transition={{ duration: 0.3, ease: "easeOut" }}
  //         className={letter === "i" ? "relative" : ""}
  //       >
  //         {letter === "i" ? (
  //           <motion.img
  //             src="/logos/debridgers.png"
  //             alt="i in Debridgers"
  //             className="mx-1 h-8 w-8 object-contain"
  //             initial={{ scale: 0, rotate: -180 }}
  //             animate={{
  //               scale:
  //                 visibleLetters.includes(letter) &&
  //                 visibleLetters.indexOf(letter) === index
  //                   ? 1
  //                   : 0,
  //               rotate:
  //                 visibleLetters.includes(letter) &&
  //                 visibleLetters.indexOf(letter) === index
  //                   ? 0
  //                   : -180,
  //             }}
  //             transition={{ duration: 0.5, ease: "easeOut" }}
  //           />
  //         ) : (
  //           letter
  //         )}
  //       </motion.span>
  //     ))}
  //   </div>
  // );
}

interface DisappearAnimationProps {
  duration: number;
  onComplete: () => void;
}

function DisappearAnimation({ duration, onComplete }: DisappearAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: duration / 1000, ease: "easeIn" }}
      className="font-syne text-primary absolute text-4xl font-semibold"
    >
      {FULL_TEXT}
    </motion.div>
  );
}

interface SplitTextAnimationProps {
  duration: number;
  onComplete: () => void;
}

function SplitTextAnimation({ duration, onComplete }: SplitTextAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="flex items-center justify-center gap-0">
      <motion.span
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: duration / 1000, ease: "easeOut" }}
        className="font-syne text-primary text-4xl font-semibold"
      >
        {SPLIT_LEFT}
      </motion.span>
      <motion.span
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: duration / 1000, ease: "easeOut" }}
        className="font-syne text-primary text-4xl font-semibold"
      >
        {SPLIT_RIGHT}
      </motion.span>
    </div>
  );
}

interface LogoDropProps {
  duration: number;
  onComplete: () => void;
}

function LogoDrop({ duration, onComplete }: LogoDropProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <motion.div
      initial={{ y: -150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: duration / 1000,
        ease: [0.34, 1.56, 0.64, 1], // Cubic bezier for gravity-like feel
      }}
      className="absolute top-0"
    >
      <motion.img
        src="/logos/debridgers.png"
        alt="Debridgers Logo"
        className="h-12 w-12 object-contain"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          duration: duration / 1000,
          ease: [0.34, 1.56, 0.64, 1], // Cubic bezier for gravity-like feel
        }}
      />
    </motion.div>
  );
}

interface HydrationProgressBarProps {
  duration: number;
}

function HydrationProgressBar({ duration }: HydrationProgressBarProps) {
  return (
    <div className="absolute bottom-8 left-1/2 h-1 w-48 -translate-x-1/2 transform overflow-hidden rounded-full bg-gray-200">
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          duration: duration / 1000,
          ease: "linear",
        }}
        className="to-primary h-full w-full origin-left rounded-full bg-linear-to-r from-gray-200"
        style={{
          background:
            "linear-gradient(to right, #e5e7eb 0%, var(--color-primary) 100%)",
        }}
      />
    </div>
  );
}

export function HydrationAnimationOverlay() {
  const {
    isHydrating,
    isInitialLoad,
    animationDuration,
    prefersReducedMotion,
  } = useHydrationAnimation();
  const [stage, setStage] = useState<
    "letterByLetter" | "disappear" | "split" | "drop" | "complete"
  >("letterByLetter");

  // Skip animation if prefers reduced motion
  if (!isHydrating || prefersReducedMotion) {
    return null;
  }

  const letterByLetterDuration = 3000; // 3s for letter-by-letter
  const disappearDuration = 800; // 0.8s
  const splitDuration = 1500; // 1.5s
  const dropDuration = 1500; // 1.5s

  const handleLetterByLetterComplete = () => setStage("disappear");
  const handleDisappearComplete = () => setStage("split");
  const handleSplitComplete = () => setStage("drop");
  const handleDropComplete = () => setStage("complete");

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === "complete" ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: stage === "complete" ? 0.2 : 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{
        pointerEvents: "none", // Allow no interaction during animation
      }}
    >
      {/* Animation Container */}
      <div className="relative flex w-full items-center justify-center">
        <AnimatePresence mode="sync">
          {stage === "letterByLetter" && (
            <motion.div key="letterByLetter">
              <LetterByLetterAnimation
                duration={letterByLetterDuration}
                onComplete={handleLetterByLetterComplete}
              />
            </motion.div>
          )}

          {stage === "disappear" && (
            <motion.div key="disappear">
              <DisappearAnimation
                duration={disappearDuration}
                onComplete={handleDisappearComplete}
              />
            </motion.div>
          )}

          {(stage === "split" || stage === "drop") && (
            <motion.div key="split">
              <SplitTextAnimation
                duration={splitDuration}
                onComplete={handleSplitComplete}
              />
            </motion.div>
          )}

          {stage === "drop" && (
            <motion.div key="drop">
              <LogoDrop
                duration={dropDuration}
                onComplete={handleDropComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="relative mt-4 h-2 w-48 overflow-hidden rounded-full bg-gray-200">
        <HydrationProgressBar duration={animationDuration} />
      </div>
    </motion.div>
  );
}
