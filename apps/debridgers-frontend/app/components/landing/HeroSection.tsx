import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { WhatsAppLink } from "@debridgers/ui-web";

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

export function renderIcon(icon: string | React.ReactNode): React.ReactNode {
  if (typeof icon === "string") {
    return <Icon icon={icon} width={16} height={16} />;
  }
  return icon as React.ReactNode;
}

export function useImageCycle(count: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (count === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 6000);
    return () => clearInterval(interval);
  }, [count]);
  return currentIndex;
}

export function useTrustCycle(count: number) {
  const [activeTrustIndex, setActiveTrustIndex] = useState(0);
  useEffect(() => {
    if (count === 0) return;
    const interval = setInterval(() => {
      setActiveTrustIndex((prev) => (prev + 1) % count);
    }, 4000);
    return () => clearInterval(interval);
  }, [count]);
  return activeTrustIndex;
}

export function HeroSection({
  images,
  servingLocation,
  headingParts,
  subtext,
  secondaryCta,
  trustItems,
}: HeroSectionProps) {
  const currentIndex = useImageCycle(images.length);
  const activeTrustIndex = useTrustCycle(trustItems.length);

  return (
    <section className="font-syne relative mx-auto flex h-full w-full flex-col overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          {images.length > 0 && (
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt=""
              initial={{ x: "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.1, ease: "easeInOut" }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </AnimatePresence>

        {/* Gradient overlays - static, outside AnimatePresence */}
        <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% via-[#23682B]/70 via-23% to-[#061107] to-100%" />
        <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% to-[#061107] to-100%" />
      </div>

      {/* Content Wrapper */}
      <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg relative z-10 mx-auto flex h-screen w-full flex-col justify-between gap-6">
        <div className="relative flex flex-1 flex-col pt-20 sm:pt-24 lg:pt-32">
          <div className="flex flex-1 flex-col justify-center gap-6 lg:gap-8">
            {/* Location badge */}
            <div className="text-primary border-primary bg-text2 font-open-sans shadow-50 inline-flex w-fit items-center gap-1 rounded-full border p-2 text-sm font-semibold backdrop-blur-lg">
              <span className="bg-primary h-1.5 w-1.5 rounded-full" />
              {servingLocation}
            </div>

            {/* Heading and Paragraph */}
            <div className="flex flex-col gap-6">
              {/* Heading */}
              <h1 className="flex flex-col text-4xl leading-tight font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl">
                {/* Top line */}
                <span>
                  {headingParts.top.map((part) => part.text).join("")}
                </span>

                {/* Bottom line */}
                <span className="flex flex-wrap items-baseline gap-x-3">
                  {headingParts.bottom.map((part: HeadingPart, index) => {
                    if (
                      part.highlight &&
                      part.text.toLowerCase().includes("zero")
                    ) {
                      return (
                        <div key={index} className="relative inline-block">
                          <span className="text-secondary">{part.text}</span>
                          <img
                            src="/images/curved-underline.jpg"
                            alt="Curved Underline"
                            className="absolute -bottom-3 left-1/2 w-[85%] -translate-x-1/2 md:w-[78%] lg:w-[82%]"
                            style={{
                              filter:
                                "drop-shadow(0 4px 6px rgba(244, 162, 97, 0.3))",
                            }}
                          />
                        </div>
                      );
                    }
                    return (
                      <span
                        key={index}
                        className={
                          part.highlight ? "text-secondary" : undefined
                        }
                      >
                        {part.text}
                      </span>
                    );
                  })}
                </span>
              </h1>

              {/* Subtext */}
              <p className="w-full max-w-120 text-base leading-relaxed font-semibold text-white sm:text-lg lg:max-w-144 lg:text-xl">
                {subtext}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:justify-start lg:gap-18">
              <WhatsAppLink shadowYellow className="w-auto" />
              <a
                href={secondaryCta.href}
                className="font-open-sans flex items-center gap-1 text-base text-white transition-all duration-300 ease-in-out hover:text-white lg:gap-2.5 lg:text-lg"
              >
                {secondaryCta.label}
                <div className="h-4 w-4 shrink-0 lg:h-5 lg:w-5">
                  <Icon icon="lucide:arrow-right" width={18} height={18} />
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="bg-primary relative mx-auto w-full px-4 py-6 shadow-md">
          {/* Mobile: slideshow, one item at a time */}
          <div className="relative flex h-6 items-center justify-center truncate overflow-hidden lg:hidden">
            <AnimatePresence mode="sync">
              <motion.div
                key={activeTrustIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="absolute flex items-center gap-2 text-white/80"
              >
                <span className="text-white/60">
                  {renderIcon(trustItems[activeTrustIndex].icon)}
                </span>
                <span className="text-sm whitespace-nowrap">
                  {trustItems[activeTrustIndex].label}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop: all items in a row */}
          <div className="hidden truncate lg:flex lg:items-center lg:justify-around">
            {trustItems.map((item, i) => (
              <div
                key={item.label}
                className={`flex shrink-0 items-center gap-6 px-4 text-white ${i < trustItems.length - 1 ? "border-r border-[#FCFDFD]" : ""}`}
              >
                <span className="text-[#FCFDFD]">{renderIcon(item.icon)}</span>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
