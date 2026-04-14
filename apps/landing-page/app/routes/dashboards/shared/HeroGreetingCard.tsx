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
      className="lg:px-2xl px-xl py-base lg:py-lg bg-primary relative overflow-hidden rounded-2xl"
    >
      <div className="lg:gap-base gap-xl sm:gap-2xl lg:justify-betwee flex h-full min-h-40 flex-col lg:flex-row lg:items-center">
        <div className="gap-lg flex h-full flex-1 flex-col justify-between">
          <p className="text-sm text-white/70">{greeting}</p>
          <h2 className="font-syne text-2xl font-bold text-white lg:text-3xl">
            {userName}
          </h2>
          <div className="text-sm text-white/70">{subtitle}</div>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 sm:items-start sm:justify-start lg:max-w-[240px] lg:flex-col xl:max-w-fit xl:flex-row">
          {infoBox}
        </div>
      </div>

      {/* Concentric Circles */}
      <div className="absolute top-[-200px] right-[-320px] z-2 h-[400px] w-[500px] rotate-127 sm:top-[-180px] sm:right-[-160px] sm:h-[400px] sm:w-[400px] lg:top-[-270px] lg:right-[-380px] lg:h-[700px] lg:w-[700px]">
        {/* Outer */}
        <div className="pointer-events-none absolute inset-0 rounded-full border-20 border-[#A5BDA8]/40" />

        {/* Middle */}
        <div className="pointer-events-none absolute inset-[40px] rounded-full border-20 border-[#A5BDA8]/40" />

        {/* Inner */}
        <div className="pointer-events-none absolute inset-[80px] rounded-full border-20 border-[#A5BDA8]/40" />
      </div>
    </motion.div>
  );
}
