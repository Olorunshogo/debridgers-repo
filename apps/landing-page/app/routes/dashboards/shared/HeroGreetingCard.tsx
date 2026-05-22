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
      className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
      style={{ backgroundColor: "var(--primary-color)" }}
    >
      {/* <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/70">{greeting}</p>
          <h2 className="font-syne text-2xl font-bold text-white lg:text-3xl">
            {userName}
          </h2>
          <div className="text-sm text-white/70">{subtitle}</div>
          <div className="mt-2 flex flex-wrap gap-3">{actions}</div>
        </div>

        <div className="flex shrink-0 gap-3">{infoBox}</div>
      </div> */}

      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full border-2 border-white/10" />
      <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full border-2 border-white/10" />
    </motion.div>
  );
}
