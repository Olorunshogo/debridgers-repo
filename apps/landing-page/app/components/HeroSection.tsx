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
    <section className="font-syne relative mx-auto flex h-full h-screen max-h-[800px] w-full flex-col overflow-hidden xl:max-h-[900px]">
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
              className="absolute inset-0 h-full w-full bg-red-900 object-contain object-cover"
            />
          )}

          {/* Inset */}
          <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% via-[#23682B]/70 via-23% to-[#061107] to-100%"></div>
          <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% to-[#061107] to-100%"></div>
        </AnimatePresence>
      </div>

      {/* Content Wrapper */}
      <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg default-max-width relative z-10 mx-auto flex h-screen max-h-[800px] w-full flex-col justify-between gap-[48px] xl:max-h-[900px]">
        <div className="relative flex flex-1 flex-col pt-20 sm:pt-24 lg:pt-32">
          <div className="gap-2xl lg:gap-4xl flex flex-1 flex-col justify-center">
            {/* Location badge */}
            <div className="text-primary border-primary font-open-sans p-sm inline-flex w-fit items-center gap-1 rounded-full border border-white/30 bg-[#A5BDA8] text-sm font-semibold shadow-[50px] backdrop-blur-lg">
              <span className="bg-primary h-1.5 w-1.5 rounded-full" />
              {servingLocation}
            </div>

            {/* Heading and Paragraph */}
            <div className="gap-lg flex flex-col">
              {/* Heading */}
              {/* <h1 className="flex flex-col text-4xl leading-tight font-bold text-white sm:text-6xl lg:text-7xl">
                <span>Market Prices.</span>
                <span className="flex flex-wrap items-baseline gap-x-3">
                  {/* Curved Underlined Zero *
              <div className="relative inline-block">
                <span>Zero</span>
                <img
                  src="/images/curved-underline.png"
                  className="absolute -mt-2 w-fit"
                />
              </div>
              {/* Highlighted Market *
              <div className="relative inline-block">
                <span style={{ color: "var(--secondary-color)" }}>Market</span>
              </div>
              {/* White Zero *
                  <span>Stress.</span>
                </span>
              </h1> */}

              {/* Heading */}
              <h1 className="flex flex-col text-5xl leading-tight font-bold text-white sm:text-6xl lg:text-7xl">
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
                          <span style={{ color: "var(--secondary-color)" }}>
                            {part.text}sss
                          </span>
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
            </div>

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
          {/* {images.length > 0 && (
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
          )} */}

          {/* Trust bar */}
          <div className="bg-primary py-xl px-base mx-auto w-full shadow-md">
            {/* Mobile: slideshow, one item at a time */}
            <div className="relative flex h-6 items-center justify-center truncate overflow-hidden lg:hidden">
              <AnimatePresence mode="sync">
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
            <div className="hidden truncate lg:flex lg:items-center lg:justify-around">
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
