import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface HeroGreetingCardProps {
  greeting: string;
  userName: string;
  subtitle: ReactNode;
  actions: ReactNode;
  infoBox: ReactNode;
}

export function HeroGreetingCard({
  greeting,
  userName,
  subtitle,
  actions,
  infoBox,
}: HeroGreetingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-primary relative overflow-hidden rounded-2xl px-6 py-4 lg:px-7 lg:py-5"
    >
      <div className="lg:justify-betwee flex h-full min-h-40 flex-col gap-6 sm:gap-7 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex h-full flex-1 flex-col justify-between gap-5">
          <p className="text-sm text-white/70">{greeting}</p>
          <h2 className="font-syne text-2xl font-bold text-white lg:text-3xl">
            {userName}
          </h2>
          <div className="text-sm text-white/70">{subtitle}</div>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 sm:items-start sm:justify-start lg:max-w-60 lg:flex-col xl:max-w-fit xl:flex-row">
          {infoBox}
        </div>
      </div>

      {/* Concentric Circles */}
      <div className="absolute -top-50 -right-80 z-2 h-100 w-125 rotate-127 sm:-top-45 sm:-right-40 sm:h-100 sm:w-100 lg:-top-68 lg:-right-95 lg:h-175 lg:w-175">
        {/* Outer */}
        <div className="pointer-events-none absolute inset-0 rounded-full border-20 border-[#A5BDA8]/40" />

        {/* Middle */}
        <div
          className="pointer-events-none absolute inset-10 rounded-full border-20"
          style={{
            borderColor:
              "color-mix(in srgb, var(--text-colour2) 40%, transparent)",
          }}
        />

        {/* Inner */}
        <div className="pointer-events-none absolute inset-20 rounded-full border-20 border-[#A5BDA8]/40" />
      </div>
    </motion.div>
  );
}
