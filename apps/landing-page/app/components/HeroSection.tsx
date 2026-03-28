import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { WhatsAppButton } from "@debridgers/ui-web";

export type HeadingPart = { text: string; highlight?: boolean };
export type TrustItem = { icon: string | React.ReactNode; label: string };
export type SecondaryCta = { label: string; href: string };

export interface HeroSectionProps {
  images: string[];
  servingLocation: string;
  headingParts: {
    top: HeadingPart[];
    bottom: HeadingPart[];
  };
  subtext: string;
  secondaryCta: SecondaryCta;
  trustItems: TrustItem[];
}

function renderIcon(icon: string | React.ReactNode): React.ReactNode {
  if (typeof icon === "string") {
    return <Icon icon={icon} width={16} height={16} />;
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
  const [activeTrustIndex, setActiveTrustIndex] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    if (trustItems.length === 0) return;
    const interval = setInterval(() => {
      setActiveTrustIndex((prev) => (prev + 1) % trustItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [trustItems.length]);

  return (
    <section className="font-syne relative mx-auto flex h-full max-h-[1064px] w-full max-w-[1440px] flex-col overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          {images.length > 0 && (
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt=""
              initial={{ x: "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.1, ease: "easeInOut" }}
              className="absolute inset-0 h-full w-full object-contain object-cover"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Content Wrapper */}
      <div className="gap-2xl px-section-px sm:px-section-px-sm lg:px-section-px-lg relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-between">
        <div className="relative flex flex-1 flex-col pt-[80px] sm:pt-[100px] lg:pt-[120px]">
          {/* Left Content */}
          <div className="gap-xl lg:gap-4xl flex flex-1 flex-col justify-center py-24 sm:py-28 lg:py-32">
            {/* Location badge */}
            <div className="px-base text-primary border-primary font-syne p-md inline-flex w-fit items-center gap-[10px] rounded-full border border-white/30 bg-[#A5BDA8] text-xl shadow-md backdrop-blur-lg">
              <span className="bg-primary h-1.5 w-1.5 rounded-full" />
              {servingLocation}
            </div>

            {/* Heading */}
            {/* <h1 className="flex flex-col text-5xl leading-tight font-bold text-white sm:text-6xl lg:text-7xl">
              {/* Top line *
              <span>
                {headingParts.top.map((part: HeadingPart) => (
                  <span key={part.text}>{part.text}</span>
                ))}
              </span>
              {/* Bottom line *
              <span>
                {headingParts.bottom.map((part: HeadingPart) =>
                  part.highlight ? (
                    <span
                      key={part.text}
                      style={{ color: "var(--secondary-color)" }}
                    >
                      {part.text}
                    </span>
                  ) : (
                    <span key={part.text}>{part.text}</span>
                  ),
                )}
              </span>
            </h1> */}

            {/* Heading */}
            <h1 className="flex flex-col text-5xl leading-tight font-bold text-white sm:text-6xl lg:text-7xl">
              {/* Top line */}
              <span>{headingParts.top.map((part) => part.text).join("")}</span>

              {/* Bottom line */}
              <span className="flex flex-wrap items-baseline gap-x-3">
                {headingParts.bottom.map((part: HeadingPart, index) => {
                  if (
                    part.highlight &&
                    part.text.toLowerCase().includes("stress")
                  ) {
                    return (
                      <span key={index} className="relative inline-block">
                        <span style={{ color: "var(--secondary-color)" }}>
                          {part.text}
                        </span>
                        <svg
                          className="pointer-events-none absolute -bottom-2 left-0 h-5 w-full"
                          viewBox="0 0 200 20"
                          fill="none"
                          preserveAspectRatio="none"
                        >
                          <path
                            d="M0 15 Q50 8 100 12 Q150 16 200 10"
                            stroke="#F9C23C"
                            strokeWidth="6"
                            strokeLinecap="round"
                            fill="none"
                          />
                        </svg>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={index}
                      style={{
                        color: part.highlight
                          ? "var(--secondary-color)"
                          : "inherit",
                      }}
                    >
                      {part.text}
                    </span>
                  );
                })}
              </span>
            </h1>

            {/* Subtext */}
            <p className="w-full max-w-[360px] text-lg leading-relaxed font-semibold text-white lg:max-w-[574px] lg:text-xl">
              {subtext}
            </p>

            {/* CTAs */}
            <div className="gap-base flex flex-col items-center justify-center lg:flex-row lg:justify-baseline lg:justify-start lg:gap-[74px]">
              <WhatsAppButton className="w-auto" />
              <a
                href={secondaryCta.href}
                className="font-open-sans flex items-center gap-1 text-base text-white transition-all duration-300 ease-in-out hover:text-white lg:gap-[10px] lg:text-lg lg:text-xl"
              >
                {secondaryCta.label}
                <div className="h-4 w-4 shrink-0 lg:h-5 lg:w-5">
                  <Icon icon="lucide:arrow-right" width={18} height={18} />
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="gap-4xl lg:gap-base relative flex w-full flex-col">
          {/* Progress bar + SCROLL label */}
          <div className="gap-md flex items-center justify-center lg:justify-end">
            <div className="h-px w-16 overflow-hidden bg-white/30">
              <motion.div
                key={currentIndex}
                className="h-full"
                style={{ backgroundColor: "var(--secondary-color)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
              />
            </div>
            <span
              className="text-[14px] font-semibold tracking-widest capitalize lg:text-xl"
              style={{ color: "var(--white)" }}
            >
              SCROLL
            </span>
          </div>

          {/* Trust bar */}
          <div className="bg-primary py-xl px-base mx-auto w-full shadow-md">
            {/* Mobile: slideshow, one item at a time */}
            <div className="relative flex h-6 items-center justify-center overflow-hidden lg:hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTrustIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="gap-sm absolute flex items-center text-white/80"
                >
                  <span className="text-white/60">
                    {renderIcon(trustItems[activeTrustIndex].icon)}
                  </span>
                  <span className="text-xs whitespace-nowrap">
                    {trustItems[activeTrustIndex].label}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Desktop: all items in a row */}
            <div className="hidden lg:flex lg:items-center lg:justify-around">
              {trustItems.map((item, i) => (
                <div
                  key={item.label}
                  className={`gap-xl px-base flex shrink-0 items-center text-white ${i < trustItems.length - 1 ? "border-r border-[#FCFDFD]" : ""}`}
                >
                  <span className="text-[#FCFDFD]">
                    {renderIcon(item.icon)}
                  </span>
                  <span className="text-[14px] font-semibold whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
