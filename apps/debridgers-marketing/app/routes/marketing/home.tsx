import type { Route } from "./+types/home";
import { buildPageMeta } from "../../lib/seo";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "@debridgers/ui-web";
import {
  renderIcon,
  useImageCycle,
  useTrustCycle,
} from "../../components/marketing/HeroSection";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  PrimaryLink,
  WhatsAppLink,
  supportWhatsAppHref,
} from "@debridgers/ui-web";

import { marketingNavLinks } from "@/components/marketing/data/data";
import { TestimonialsSection } from "../../components/marketing/TestimonialsSection";
// === Why Debridgers
interface WhyCardData {
  icon: string;
  title: string;
  description: string;
}

const whyCardsData: WhyCardData[] = [
  {
    icon: "lucide:lock-keyhole",
    title: "Fixed, fair prices",
    description:
      "No more guessing what rice costs today. Our prices are set weekly and always reflect real market rates, nothing more.",
  },
  {
    icon: "lucide:check",
    title: "Quality guaranteed",
    description:
      "If you're not satisfied, we replace the orders. No questions asked. Our reputation depends on what lands at your door.",
  },
  {
    icon: "lucide:smartphone",
    title: "Order your way",
    description:
      "WhatsApp, phone call, or app, whatever is easiest for you. No complex platforms, no downloads required to get started.",
  },
];

interface WhyCardProps {
  card: WhyCardData;
  isActive: boolean;
  onHover: () => void;
}

function WhyCard({ card, isActive, onHover }: WhyCardProps) {
  return (
    <motion.div
      onHoverStart={onHover}
      onClick={onHover}
      whileHover={{ y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group font-syne flex h-full flex-col gap-4 rounded-3xl px-4 py-4 transition-all duration-300 ease-in-out lg:gap-6 lg:px-10 ${
        isActive
          ? "bg-primary text-white"
          : "border-line hover:border-primary border bg-white"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
          isActive
            ? "bg-[#789B7C] text-[#FCFDFD]"
            : "bg-[#789B7C] text-[#FCFDFD] group-hover:bg-white/20 group-hover:text-white"
        }`}
      >
        <Icon icon={card.icon} className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        <h3
          className={`text-xl font-bold transition-colors duration-300 lg:text-2xl ${
            isActive ? "text-white" : "text-heading group-hover:text-white"
          }`}
        >
          {card.title}
        </h3>
        <p
          className={`font-open-sans flex-1 text-base leading-relaxed transition-colors duration-300 lg:text-lg ${
            isActive ? "text-white" : "text-body group-hover:text-emerald-100"
          }`}
        >
          {card.description}
        </p>
      </div>
    </motion.div>
  );
}

// === Delivery Category
interface DeliverVariant {
  name: string;
  image: string;
}

interface WhatWeDeliverCategory {
  title: string;
  variants: DeliverVariant[];
}

const whatWeDeliverCategories: WhatWeDeliverCategory[] = [
  {
    title: "Grains & Staples",
    variants: [
      {
        name: "Local White Rice",
        image: "/images/landing/deliver-grains-staples-1.jpg",
      },
      {
        name: "Ofada Rice",
        image: "/images/landing/deliver-grains-staples-2.jpg",
      },
      {
        name: "Tuwo Rice",
        image: "/images/landing/deliver-grains-staples-3.jpg",
      },
    ],
  },
  {
    title: "Beans",
    variants: [
      { name: "Wake Gida", image: "/images/landing/deliver-grains-1.jpg" },
      { name: "Cowpea", image: "/images/landing/deliver-grains-2.jpg" },
      { name: "Soya Beans", image: "/images/landing/deliver-grains-3.jpg" },
    ],
  },
  {
    title: "Oil & Protein",
    variants: [
      {
        name: "Fresh Palm Oil",
        image: "/images/landing/deliver-oil-protein-1.jpg",
      },
      {
        name: "Groundnut Oil",
        image: "/images/landing/deliver-oil-protein-2.jpg",
      },
      {
        name: "Vegetable Oil",
        image: "/images/landing/deliver-oil-protein-3.jpg",
      },
    ],
  },
  {
    title: "Tubers",
    variants: [
      { name: "Yam", image: "/images/landing/deliver-tubers-1.jpg" },
      { name: "Irish Potato", image: "/images/landing/deliver-tubers-2.jpg" },
    ],
  },
];

// === DeliverCard
/*
 * Images are static on load, cycling right-to-left only on hover.
 * The subtitle fades out on index change, then fades in 1.6s later (600ms transition + 1s hold).
 */
function DeliverCard({
  whatWeDeliverCategory,
}: {
  whatWeDeliverCategory: WhatWeDeliverCategory;
}) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [subtitleVisible, setSubtitleVisible] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subtitleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { variants } = whatWeDeliverCategory;

  const startCycling = () => {
    if (variants.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % variants.length);
      setSubtitleVisible(false);
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = setTimeout(
        () => setSubtitleVisible(true),
        1600,
      );
    }, 900);
  };

  const stopCycling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (subtitleTimerRef.current) {
      clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = null;
    }
    setActiveIndex(0);
    setSubtitleVisible(true);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
    };
  }, []);

  return (
    <motion.div
      onHoverStart={() => {
        setIsHovered(true);
        startCycling();
      }}
      onHoverEnd={() => {
        setIsHovered(false);
        stopCycling();
      }}
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.3 }}
      className="group relative h-80 w-55 shrink-0 cursor-default overflow-hidden rounded-3xl shadow-lg sm:h-95 sm:w-65"
    >
      {/* Images - static until hover, then swipe right-to-left */}
      {variants.map(({ image, name }, idx) => (
        <motion.img
          key={image}
          src={image}
          alt={`${whatWeDeliverCategory.title} — ${name}`}
          className="absolute inset-0 h-full w-full object-cover"
          animate={{
            x:
              idx === activeIndex ? "0%" : idx < activeIndex ? "-100%" : "100%",
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-[#666666]/30 to-transparent" />

      {/* Label - title always visible, subtitle fades on index change */}
      <div className="font-open-sans absolute right-0 bottom-4 left-0 flex flex-col gap-1 p-4 text-white">
        <p className="text-lg font-semibold">{whatWeDeliverCategory.title}</p>
        <motion.p
          animate={{
            opacity: subtitleVisible ? 1 : 0,
            y: subtitleVisible ? 0 : 4,
          }}
          transition={{ duration: 0.35 }}
          className="text-base"
        >
          {variants[activeIndex].name}
        </motion.p>
      </div>

      {/* Image dots - visible on hover */}
      {isHovered && variants.length > 1 && (
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-1.5">
          {variants.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === activeIndex ? "scale-110 bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// === WhatWeDeliver
/* Infinite seamless loop, 4 cards visible on lg. */
function WhatWeDeliver() {
  const [offset, setOffset] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  // cardWidth matches w-65, gap matches gap-6 (24px).
  const cardWidth = 260;
  const gap = 24;
  const step = cardWidth + gap;
  const totalCards = whatWeDeliverCategories.length;
  /* Doubled so scrolling past the real list can snap back to index 0 unnoticed once offset reaches totalCards. */
  const doubled = [...whatWeDeliverCategories, ...whatWeDeliverCategories];

  useEffect(() => {
    if (isHovered) {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      return;
    }
    autoScrollRef.current = setInterval(() => {
      setOffset((prev) => {
        const next = prev + 1;
        if (next >= totalCards) {
          /*
           * Schedule a silent snap back to 0 after the spring animation completes.
           * The 700ms delay matches the spring animation duration.
           * Animation is re-enabled on the next tick after the snap.
           */
          setTimeout(() => {
            setIsAnimating(false);
            setOffset(0);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setIsAnimating(true));
            });
          }, 700);
        }
        return next;
      });
    }, 2200);
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [isHovered, totalCards]);

  return (
    <section id="what-we-deliver" className="relative w-full bg-white">
      <div className="font-syne section-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto flex w-full flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:gap-6">
          <p className="text-primary-light text-xl tracking-widest">
            What we deliver
          </p>

          <div className="flex w-full flex-wrap items-start justify-between gap-6">
            <h2 className="text-primary font-syne lg:text-50 max-w-188 text-3xl leading-tight font-extrabold sm:text-4xl lg:font-bold">
              Everything you spend on at the market.
            </h2>

            <PrimaryLink
              href={supportWhatsAppHref()}
              className="font-syne px-6 py-3 text-xl font-bold sm:text-2xl lg:text-3xl"
            >
              Send Order
            </PrimaryLink>
          </div>
        </div>

        {/* Carousel - overflow-hidden clips cards beyond 4 on lg */}
        <div
          className="overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div
            className="flex gap-6"
            animate={{ x: `-${offset * step}px` }}
            transition={
              isAnimating
                ? { type: "spring", stiffness: 300, damping: 30 }
                : { duration: 0 }
            }
            style={{
              width: `${doubled.length * (cardWidth + gap) - gap}px`,
            }}
          >
            {doubled.map((category, index) => (
              <DeliverCard
                key={`${category.title}-${index}`}
                whatWeDeliverCategory={category}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// === BlurDot
/* Reusable yellow radial-gradient blur dot. */
function BlurDot({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(255,213,79,0.9) 40%, rgba(255,213,79,0) 100%)",
        filter: "blur(40px)",
        width: "112px",
        height: "74px",
        borderRadius: "50%",
      }}
    />
  );
}

// === Stats
interface Stat {
  value: number;
  label: string;
}

const stats: Stat[] = [
  { value: 92, label: "resident of Kaduna are using us." },
  { value: 1000, label: "areas in Kaduna South we serve" },
  { value: 0, label: "no hidden fees ever" },
];

const statsFormatters: Array<(v: number) => string> = [
  (v) => `${v}%`,
  (v) => `${v}+`,

  (v) => String(Number(v) + 0),
];

// === Metadata
export function meta({}: Route.MetaArgs) {
  return buildPageMeta({
    title: "Debridgers | Market Prices. Zero Market Stress.",
    description:
      "Fresh foodstuff at Central Market prices, delivered to your door. Rice, beans, palm oil and more — serving Kaduna.",
    path: "/",
    keywords: [
      "fresh foodstuff delivery Kaduna",
      "market price food delivery Nigeria",
      "rice beans delivery Kaduna",
      "affordable food delivery Kaduna",
      "palm oil delivery Nigeria",
      "fresh produce Kaduna",
    ],
  });
}

export default function Home() {
  const { isAuthenticated, dashboardPath } = useAuth();
  const [activeWhyCardIndex, setActiveWhyCardIndex] = useState<number>(0);
  const currentIndex = useImageCycle(1);
  const activeTrustIndex = useTrustCycle(4);
  const images = ["/images/landing/hero-1.jpg"];

  const trustItems = [
    { icon: "lucide:check", label: "Guarantee fresh produce" },
    { icon: "lucide:map-pin", label: "Sarbon Tasha • Narayi• Kakuri" },
    { icon: "lucide:tag", label: "Transparent, fixed pricing" },
    { icon: "lucide:truck", label: "Fast Delivery" },
  ];
  return (
    <>
      <Header
        navLinks={marketingNavLinks}
        signUpHref="/signup"
        heroSectionId="hero-section"
        isAuthenticated={isAuthenticated}
        dashboardPath={dashboardPath}
      />

      {/* Hero Section */}
      <div className="relative flex w-full flex-col">
        <div className="-mt-navbar-h flex min-h-0 w-full flex-1">
          <div className="font-syne -mt-navbar-h bg-primary absolute inset-0 z-0 overflow-hidden" />
          <section
            id="hero-section"
            aria-label="Hero"
            className="font-syne relative mx-auto flex h-full min-h-[80dvh] w-full flex-col overflow-hidden xl:min-h-[720px]"
          >
            {/* Background layer */}
            <div className="absolute inset-0 z-0 h-full w-full">
              <AnimatePresence mode="sync">
                {images.length > 0 && (
                  <motion.img
                    key={`hero-img-${currentIndex}`}
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
              <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% via-[#23682B]/70 via-23% to-[#061107] to-100%"></div>
              <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% to-[#061107] to-100%"></div>
            </div>

            {/* Content Wrapper */}
            <div className="px-section-px section-max-width sm:px-section-px-sm lg:px-section-px-lg relative z-10 mx-auto flex h-full w-full flex-col justify-between gap-8 md:gap-6 xl:gap-10">
              <div className="relative flex flex-1 flex-col pt-20 sm:pt-24 lg:pt-32">
                <div className="flex flex-1 flex-col justify-center gap-6 lg:gap-10">
                  {/* Location badge */}
                  <div className="text-primary bg-text2 font-open-sans border-primary shadow-50 flex w-fit items-center gap-1 rounded-full border p-2 text-sm font-semibold backdrop-blur-lg xl:text-base">
                    <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                    Now Serving in Kaduna
                  </div>

                  {/* Heading and Paragraph */}
                  <div className="flex flex-col gap-6">
                    {/* Heading */}
                    <h1 className="flex flex-col text-4xl leading-tight font-bold text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
                      <span>Market Prices.</span>
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        {/* Curved Underlined Zero */}
                        <div className="relative inline-block">
                          <span>Zero</span>
                          <img
                            src="/images/landing/curved-underline.png"
                            className="absolute -mt-2 w-fit"
                          />
                        </div>
                        {/* Highlighted Market */}
                        <div className="relative inline-block">
                          <span className="text-secondary">Market</span>
                        </div>
                        {/* White Zero */}
                        <span>Stress.</span>
                      </span>
                    </h1>

                    {/* Subtext */}
                    <p className="w-full max-w-90 text-base leading-relaxed font-medium text-white sm:text-lg lg:max-w-144 lg:text-xl xl:max-w-160 xl:text-2xl">
                      Fresh foodstuff delivered straight to your door step. At
                      the same price you&apos;d pay at Central Market.
                    </p>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:justify-start lg:gap-18.5">
                    <WhatsAppLink shadowYellow className="w-auto" />
                    <a
                      href="#how-it-works"
                      className="font-open-sans flex items-center gap-1 text-base text-white transition-all duration-300 ease-in-out hover:text-white sm:text-lg lg:gap-2.5 lg:text-xl"
                    >
                      See how it works
                      <div className="h-4 w-4 shrink-0 lg:h-5 lg:w-5">
                        <Icon
                          icon="lucide:arrow-right"
                          width={18}
                          height={18}
                        />
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              <div className="relative flex w-full flex-col gap-12 lg:gap-4">
                {/* Trust bar */}
                <div className="bg-primary mx-auto w-full px-4 py-6 shadow-md">
                  {/* Mobile: slideshow */}
                  <div className="relative flex h-6 items-center justify-center overflow-hidden lg:hidden">
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
                        <span className="text-[#FCFDFD]">
                          {renderIcon(item.icon)}
                        </span>
                        <span className="text-sm font-semibold whitespace-nowrap xl:text-lg">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="relative w-full bg-white">
        <div className="lg:py-section-py-lg py-section-py section-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg sm:py-section-py-sm mx-auto grid w-full items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-10"
          >
            <div className="flex flex-col gap-3">
              <p className="text-body text-xl font-medium xl:text-2xl">
                How it works
              </p>
              <h2 className="text-primary text-2xl leading-tight font-bold sm:text-3xl lg:text-5xl xl:text-6xl">
                From market to your door in two steps
              </h2>
            </div>

            <div className="flex flex-col">
              {/* Step 1 */}
              <div className="text-body flex gap-6 border-b border-[#E5E7EB] py-4">
                <div className="font-syne flex h-9 w-9 shrink-0 items-center justify-center text-lg lg:text-xl xl:text-2xl">
                  01
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-syne text-lg font-bold sm:text-xl lg:text-2xl xl:text-3xl">
                    Send us your order
                  </h3>
                  <p className="font-open-sans text-sm leading-relaxed sm:text-base xl:text-lg">
                    Chat on WhatsApp, call, or browse our catalog. Tell us what
                    you need: rice, beans, palm oil, etc.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="text-body flex gap-6 py-4">
                <div className="font-syne flex h-9 w-9 shrink-0 items-center justify-center text-lg lg:text-xl xl:text-2xl">
                  02
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-syne text-lg font-bold sm:text-xl lg:text-2xl xl:text-3xl">
                    Delivered to you
                  </h3>
                  <p className="font-open-sans text-sm leading-relaxed sm:text-base xl:text-lg">
                    Your order arrives at your home or shop at the market price
                    you agreed. No surprises, no hidden fees.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Image + Market woman Card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="group relative overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="/images/landing/market-lady.jpg"
                alt="Smiling Nigerian woman at fresh produce market"
                className="h-full max-h-130 w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105 lg:max-h-132"
              />
              {/* Delivery Info Card */}
              <div className="bg-primary-light border-primary-light absolute right-2.5 bottom-2.5 left-2.5 flex flex-col gap-2.5 rounded-3xl border px-6 py-3 text-white shadow-md">
                <div className="flex items-center gap-2.5 text-sm sm:text-base">
                  Next Delivery
                </div>
                <p className="text-sm font-semibold sm:text-base lg:text-lg">
                  Kaduna South • Today
                </p>
                <p className="text-sm lg:text-base">
                  Order before 12pm to experience same day delivery
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Debridgers */}
      <section id="why-debridgers" className="relative w-full bg-[#F6F3F3]">
        <div className="font-syne px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg section-max-width mx-auto flex w-full flex-col gap-10">
          <div className="flex flex-col gap-3 lg:gap-6">
            <p className="text-primary-light text-xl tracking-widest">
              Why Debridgers
            </p>
            <h2 className="text-primary w-full text-3xl font-bold sm:text-4xl lg:text-5xl lg:font-bold">
              We solve what the market can&apos;t.
            </h2>
          </div>

          <div className="font-syne grid gap-6 lg:grid-cols-3">
            {whyCardsData.map((card, index) => (
              <WhyCard
                key={card.title}
                card={card}
                isActive={index === activeWhyCardIndex}
                onHover={() => setActiveWhyCardIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* What We Deliver */}
      <WhatWeDeliver />

      <TestimonialsSection />

      {/* Stats Section */}
      <section
        id="stats"
        className="font-syne bg-primary relative w-full overflow-hidden text-white"
      >
        <div className="section-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto">
          {/* Blur Dot */}
          <div className="pointer-events-none absolute inset-0 z-1">
            <BlurDot className="absolute bottom-[0%] left-[12%] h-30 w-28" />
            <BlurDot className="absolute bottom-[50%] left-[40%] h-30 w-28" />
            <BlurDot className="absolute bottom-[70%] left-[90%] h-30 w-28 lg:left-[70%]" />
          </div>

          {/* Stats */}
          <div className="relative z-10 flex w-full flex-col lg:gap-12">
            <div className="font-syne flex flex-col gap-3 pb-8">
              <p className="text-text2 text-xl tracking-wider uppercase">
                Early Numbers
              </p>
              <h2 className="w-full text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl lg:font-extrabold">
                People are already excited.
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-10">
              {stats.map((stat, i) => {
                const displayValue = statsFormatters[i](stat.value);
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="lg:w-w-60 flex flex-col gap-2"
                  >
                    <div className="text-secondary font-syne text-2xl leading-none font-extrabold sm:text-4xl lg:text-5xl">
                      {displayValue}
                    </div>
                    <p className="font-open-sans sm:text-body-sm text-xs text-white lg:text-base">
                      {stat.label}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Concentric Circles */}
          <div className="absolute -top-80 -right-80 z-2 h-100 w-125 rotate-127 sm:-top-45 sm:-right-30 sm:h-100 sm:w-100 lg:-top-68 lg:-right-95 lg:h-175 lg:w-175">
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
        </div>
      </section>

      {/* GetStarted Section */}
      <section id="get-started" className="relative overflow-hidden bg-white">
        <div className="section-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg relative mx-auto overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-1">
            <BlurDot className="absolute bottom-[40%] left-[12%] h-30 w-28" />
            <BlurDot className="absolute bottom-[50%] left-[50%] h-30 w-28" />
            <BlurDot className="absolute bottom-[70%] left-[90%] h-30 w-28 lg:left-[70%]" />
          </div>

          <div className="relative flex w-full flex-col items-center justify-center gap-6 text-center lg:gap-10">
            <div className="flex flex-col gap-3">
              <p className="text-primary-light font-open-sans text-center text-lg font-semibold tracking-widest lg:text-xl xl:text-2xl">
                Get started
              </p>

              <h2 className="text-primary font-syne mx-auto w-full max-w-110 text-center text-4xl leading-tight font-extrabold sm:max-w-125 sm:text-5xl lg:max-w-208 lg:text-6xl xl:text-7xl">
                Your first delivery is on us.
              </h2>

              <p className="text-primary font-open-sans mx-auto w-full max-w-120 text-base sm:max-w-125 lg:max-w-208 lg:text-lg xl:text-2xl">
                Join early and get free delivery on your first order. Just send
                us a WhatsApp and we&apos;ll take it from there.
              </p>
            </div>

            <WhatsAppLink label="Chat with us on whatsApp" />
          </div>
        </div>
      </section>
    </>
  );
}
