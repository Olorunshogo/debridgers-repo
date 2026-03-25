import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WhatsAppButton } from "@debridgers/ui-web";

export type HeadingPart = { text: string; highlight?: boolean };
export type TrustItem = { icon: LucideIcon | React.ReactNode; label: string };
export type SecondaryCta = { label: string; href: string };

export interface HeroSectionProps {
  images: string[];
  servingLocation: string;
  headingParts: HeadingPart[];
  subtext: string;
  secondaryCta: SecondaryCta;
  trustItems: TrustItem[];
}

function renderIcon(icon: LucideIcon | React.ReactNode): React.ReactNode {
  if (
    icon &&
    (typeof icon === "function" ||
      (typeof icon === "object" && "$$typeof" in (icon as object)))
  ) {
    const Icon = icon as LucideIcon;
    return <Icon size={16} />;
  }
  return icon as React.ReactNode;
}

export function HeroSection({
  images,
  servingLocation,
  headingParts,
  subtext,
  secondaryCta,
  trustItems,
}: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          {images.length > 0 && (
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </AnimatePresence>
        {/* Dark overlay */}
        {/* <div className="absolute inset-0 bg-black/55" /> */}
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Left column */}
        <div className="flex flex-1 flex-col justify-center px-6 py-24 lg:max-w-[55%] lg:px-16 lg:py-32">
          {/* Location badge */}
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {servingLocation}
          </div>

          {/* Heading */}
          <h1 className="mb-4 text-4xl leading-tight font-extrabold text-white lg:text-6xl">
            {headingParts.map((part) =>
              part.highlight ? (
                <span
                  key={part.text}
                  style={{ color: "var(--color-secondary)" }}
                >
                  {part.text}
                </span>
              ) : (
                <span key={part.text}>{part.text}</span>
              ),
            )}
          </h1>

          {/* Subtext */}
          <p className="mb-8 max-w-md text-sm leading-relaxed text-white/80 lg:text-base">
            {subtext}
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <WhatsAppButton className="w-full sm:w-auto" />
            <a
              href={secondaryCta.href}
              className="flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
            >
              {secondaryCta.label}
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Progress bar + SCROLL label — bottom right */}
      <div className="absolute right-6 bottom-20 z-10 flex items-center gap-3 lg:right-16">
        <div className="h-px w-16 overflow-hidden bg-white/30">
          <motion.div
            key={currentIndex}
            className="h-full"
            style={{ backgroundColor: "var(--color-secondary)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 6, ease: "linear" }}
          />
        </div>
        <span
          className="text-xs font-semibold tracking-widest"
          style={{ color: "var(--color-secondary)" }}
        >
          SCROLL
        </span>
      </div>

      {/* Trust bar */}
      <div className="absolute right-0 bottom-0 left-0 z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-6 overflow-x-auto px-6 py-3 lg:justify-around lg:overflow-visible lg:px-16">
          {trustItems.map((item) => (
            <div
              key={item.label}
              className="flex shrink-0 items-center gap-2 text-white/80"
            >
              <span className="text-white/60">{renderIcon(item.icon)}</span>
              <span className="text-xs whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
