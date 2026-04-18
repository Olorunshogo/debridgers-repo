import type { Route } from "./+types/home";
import { Header } from "../../components/Header";
import {
  renderIcon,
  useImageCycle,
  useTrustCycle,
} from "../../components/HeroSection";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { PrimaryLink, WhatsAppButton } from "@debridgers/ui-web";

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
      "No more guessing what rice costs today. Our prices are set weekly and always reflect real market rates — nothing more.",
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
      "WhatsApp, phone call, or app — whatever is easiest for you. No complex platforms, no downloads required to get started.",
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
      className={`group font-syne gap-base lg:gap-xl py-base px-3xl flex h-full flex-col rounded-3xl transition-all duration-300 ease-in-out ${
        isActive
          ? "bg-primary text-white"
          : "border-gray hover:border-primary border bg-white"
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
            isActive ? "text-white" : "text-text group-hover:text-emerald-100"
          }`}
        >
          {card.description}
        </p>
      </div>
    </motion.div>
  );
}

// === Delivery Category
interface DeliverCategory {
  title: string;
  subtitle: string;
  images: string[];
}

const deliverCategories: DeliverCategory[] = [
  {
    title: "Grain & Staples",
    subtitle: "Rice, Beans, Garri",
    images: [
      "/images/deliver-grains-staples-1.jpg",
      "/images/deliver-grains-staples-2.jpg",
      "/images/deliver-grains-staples-3.jpg",
    ],
  },
  {
    title: "Grains",
    subtitle: "Beans",
    images: [
      "/images/deliver-grains-1.jpg",
      "/images/deliver-grains-2.jpg",
      "/images/deliver-grains-3.jpg",
    ],
  },
  {
    title: "Oil & Protein",
    subtitle: "Groundnut oil, Palm Oil",
    images: [
      "/images/deliver-oil-protein-1.jpg",
      "/images/deliver-oil-protein-2.jpg",
      "/images/deliver-oil-protein-3.jpg",
    ],
  },
  {
    title: "Tubers",
    subtitle: "Yam, Potato",
    images: [
      "/images/deliver-tubers-1.jpg",
      "/images/deliver-tubers-2.jpg",
      "/images/deliver-tubers-3.jpg",
    ],
  },
];

// === WhatWeDeliver: 4 cards visible on lg, infinite marquee through all 6
// === DeliverCard: images static on load, cycle right-to-left only on hover
function DeliverCard({ category }: { category: DeliverCategory }) {
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCycling = () => {
    if (category.images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % category.images.length);
    }, 900);
  };

  const stopCycling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveImageIndex(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
      className="group relative h-[380px] w-[260px] shrink-0 cursor-default overflow-hidden rounded-3xl shadow-lg"
    >
      {/* Images — static until hover, then swipe right-to-left */}
      {category.images.map((src, idx) => (
        <motion.img
          key={src}
          src={src}
          alt={`${category.title} - image ${idx + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
          animate={{
            x:
              idx === activeImageIndex
                ? "0%"
                : idx < activeImageIndex
                  ? "-100%"
                  : "100%",
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-[#666666]/30 to-transparent" />

      {/* Label */}
      <div className="font-open-sans px-base absolute right-0 bottom-0 left-0 flex flex-col gap-1 pb-(--space-base) text-white">
        <p className="text-lg font-semibold">{category.title}</p>
        <p className="text-base">{category.subtitle}</p>
      </div>

      {/* Image dots — visible on hover */}
      {isHovered && category.images.length > 1 && (
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-1.5">
          {category.images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === activeImageIndex ? "scale-110 bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// === WhatWeDeliver: infinite seamless loop, 4 cards visible on lg
function WhatWeDeliver() {
  const [offset, setOffset] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const cardWidth = 260; // w-[260px]
  const gap = 24; // gap-6 = 24px
  const step = cardWidth + gap;
  const totalCards = deliverCategories.length;
  // === Render doubled list - when offset hits totalCards, silently snap back to 0
  const doubled = [...deliverCategories, ...deliverCategories];

  useEffect(() => {
    if (isHovered) {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      return;
    }
    autoScrollRef.current = setInterval(() => {
      setOffset((prev) => {
        const next = prev + 1;
        if (next >= totalCards) {
          // Schedule a silent snap back to 0 after the spring animation completes
          setTimeout(() => {
            setIsAnimating(false);
            setOffset(0);
            // Re-enable animation on next tick
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setIsAnimating(true));
            });
          }, 700); // matches spring duration
        }
        return next;
      });
    }, 2200);
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [isHovered, totalCards]);

  return (
    <section
      id="what-we-deliver"
      className="font-syne py-section-py sm:py-section-py-sm lg:py-section-py-lg relative w-full bg-white"
    >
      <div className="gap-3xl px-section-px sm:px-section-px-sm lg:px-section-px-lg default-max-width mx-auto flex w-full flex-col">
        {/* Header */}
        <div className="gap-md lg:gap-xl flex flex-col">
          <p className="text-primary-light text-xl tracking-widest">
            What we deliver
          </p>

          <div className="gap-xl flex w-full flex-wrap items-start justify-between">
            <h2 className="text-primary font-syne max-w-[751px] text-3xl leading-tight font-extrabold sm:text-4xl lg:text-[50px] lg:font-bold">
              Everything you spend on at the market.
            </h2>

            <PrimaryLink
              href="https://wa.me/+2348167042797"
              className="font-syne py-md px-xl text-xl font-bold sm:text-2xl lg:text-3xl"
            >
              Send Order
            </PrimaryLink>
          </div>
        </div>

        {/* Carousel — overflow-hidden clips cards beyond 4 on lg */}
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
                category={category}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// === BlurDot: reusable yellow radial-gradient blur dot
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
  { value: 0, label: "hidden fees — ever" },
];

const statsFormatters: Array<(v: number) => string> = [
  (v) => `${v}%`,
  (v) => `${v}+`,
  (v) => String(Number(v) + 0),
];

// === Metadata
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Debridgers | Market Prices. Zero Market Stress." },
    {
      name: "description",
      content:
        "Debridgers delivers fresh foodstuff straight to your door or shop at the exact price you would pay at Central Market. Rice, beans, palm oil, garri and more. Now serving Kaduna South.",
    },
    {
      name: "keywords",
      content:
        "fresh foodstuff delivery Kaduna, market price food delivery Nigeria, rice beans delivery Kaduna South, affordable food delivery Nigeria, Debridgers, fresh produce delivery, zero hidden fees food delivery",
    },

    // === Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://debridgers.com/" },
    { property: "og:site_name", content: "Debridgers" },
    {
      property: "og:title",
      content: "Debridgers | Market Prices. Zero Market Stress.",
    },
    {
      property: "og:description",
      content:
        "Fresh foodstuff delivered to your door at the same price you would pay at Central Market. No hidden fees. No middlemen. Just fresh food, fast.",
    },
    { property: "og:image", content: "https://debridgers.com/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: "en_NG" },

    // === Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: "https://debridgers.com/" },
    {
      name: "twitter:title",
      content: "Debridgers | Market Prices. Zero Market Stress.",
    },
    {
      name: "twitter:description",
      content:
        "Fresh foodstuff delivered to your door at the same price you would pay at Central Market. No hidden fees. No middlemen. Just fresh food, fast.",
    },
    { name: "twitter:image", content: "https://debridgers.com/og-image.png" },

    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "index, follow" },
  ];
}

export default function Home() {
  const [activeWhyCardIndex, setActiveWhyCardIndex] = useState<number>(0);
  const currentIndex = useImageCycle(1);
  const activeTrustIndex = useTrustCycle(4);
  const images = ["/images/hero-1.jpg"];

  const trustItems = [
    { icon: "lucide:check", label: "Guarantee fresh produce" },
    { icon: "lucide:map-pin", label: "Sarbon Tasha • Narayi• Kakuri" },
    { icon: "lucide:tag", label: "Transparent, fixed pricing" },
    { icon: "lucide:truck", label: "Fast Delivery" },
  ];
  return (
    <>
      {/* Header */}
      <div className="top-md sticky z-50">
        <Header
          navLinks={[
            { label: "Home", href: "/" },
            { label: "Agents", href: "/agents" },
            { label: "Contact Us", href: "/contact" },
          ]}
          signUpHref="/signup"
          heroSectionId="hero-section"
        />
      </div>

      {/* Hero Section */}
      <div className="relative flex w-full flex-col">
        <div className="-mt-navbar-h flex max-h-[800px] min-h-0 w-full flex-1 xl:max-h-[900px]">
          <div className="font-syne -mt-navbar-h bg-primary absolute inset-0 z-0 overflow-hidden" />
          <section
            id="hero-section"
            className="font-syne relative mx-auto flex h-full min-h-screen w-full max-w-[1840px] flex-col overflow-hidden"
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
                    className="absolute inset-0 h-full w-full object-contain object-cover"
                  />
                )}
              </AnimatePresence>
              <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% via-[#23682B]/70 via-23% to-[#061107] to-100%"></div>
              <div className="absolute inset-0 h-full w-full bg-linear-to-b from-[40BF4F]/20 from-0% to-[#061107] to-100%"></div>
            </div>

            {/* Content Wrapper */}
            <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg default-max-width relative z-10 mx-auto flex h-screen max-h-[800px] w-full flex-col justify-between gap-[48px] xl:max-h-[900px]">
              <div className="relative flex flex-1 flex-col pt-20 sm:pt-24 lg:pt-32">
                <div className="gap-2xl lg:gap-4xl flex flex-1 flex-col justify-center">
                  {/* Location badge */}
                  <div className="text-primary border-primary font-open-sans p-sm inline-flex w-fit items-center gap-1 rounded-full border border-white/30 bg-[#A5BDA8] text-sm font-semibold shadow-[50px] backdrop-blur-lg">
                    <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                    Now Serving in Kaduna
                  </div>

                  {/* Heading and Paragraph */}
                  <div className="gap-lg flex flex-col">
                    {/* Heading */}
                    <h1 className="flex flex-col text-4xl leading-tight font-bold text-white sm:text-6xl lg:text-7xl">
                      <span>Market Prices.</span>
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        {/* Curved Underlined Zero */}
                        <div className="relative inline-block">
                          <span>Zero</span>
                          <img
                            src="/images/curved-underline.png"
                            className="absolute -mt-2 w-fit"
                          />
                        </div>
                        {/* Highlighted Market */}
                        <div className="relative inline-block">
                          <span style={{ color: "var(--secondary-color)" }}>
                            Market
                          </span>
                        </div>
                        {/* White Zero */}
                        <span>Stress.</span>
                      </span>
                    </h1>

                    {/* Subtext */}
                    <p className="w-full max-w-[360px] text-base leading-relaxed font-semibold text-white sm:text-lg lg:max-w-[574px] lg:text-xl">
                      Fresh foodstuff delivered straight to your door step. At
                      the same price you&apos;d pay at Central Market.
                    </p>
                  </div>

                  {/* CTAs */}
                  <div className="gap-base flex flex-col items-center justify-center lg:flex-row lg:justify-start lg:gap-[74px]">
                    <WhatsAppButton className="w-auto" />
                    <a
                      href="#how-it-works"
                      className="font-open-sans flex items-center gap-1 text-base text-white transition-all duration-300 ease-in-out hover:text-white sm:text-lg lg:gap-[10px] lg:text-xl"
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

              <div className="gap-4xl lg:gap-base relative flex w-full flex-col">
                {/* Trust bar */}
                <div className="bg-primary py-xl px-base mx-auto w-full shadow-md">
                  {/* Mobile: slideshow */}
                  <div className="relative flex h-6 items-center justify-center overflow-hidden lg:hidden">
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
        </div>
      </div>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg relative bg-white"
      >
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg default-max-width mx-auto">
          <div className="gap-4xl grid items-center lg:grid-cols-2">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="gap-3xl flex flex-col"
            >
              <div className="gap-md flex flex-col">
                <p className="text-text text-[14px] font-semibold">
                  How it works
                </p>
                <h2 className="text-primary text-xl leading-tight font-bold sm:text-3xl lg:text-5xl">
                  From market to your door in two steps
                </h2>
              </div>

              <div className="flex flex-col">
                {/* Step 1 */}
                <div className="py-base text-text gap-lg flex border-b border-[#E5E7EB]">
                  <div className="font-syne flex h-9 w-9 shrink-0 items-center justify-center text-lg lg:text-xl">
                    01
                  </div>
                  <div className="gap-sm flex flex-col">
                    <h3 className="font-syne text-lg font-bold sm:text-xl lg:text-2xl">
                      Send us your order
                    </h3>
                    <p className="font-open-sans text-[14px] leading-relaxed lg:text-base">
                      Chat on WhatsApp, call, or browse our catalog. Tell us
                      what you need — rice, beans, palm oil, anything.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}

                <div className="py-base text-text gap-lg flex">
                  <div className="font-syne flex h-9 w-9 shrink-0 items-center justify-center text-lg lg:text-xl">
                    02
                  </div>
                  <div className="gap-sm flex flex-col">
                    <h3 className="font-syne text-lg font-bold sm:text-xl lg:text-2xl">
                      Delivered to you
                    </h3>
                    <p className="font-open-sans text-[14px] leading-relaxed lg:text-base">
                      Your order arrives at your home or shop at the market
                      price you agreed. No surprises, no hidden fees.
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
                  src="/images/market-lady.jpg"
                  alt="Smiling Nigerian woman at fresh produce market"
                  className="h-full max-h-[516px] w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105 lg:max-h-[530px]"
                />
                {/* Delivery Info Card */}
                <div className="bg-primary-light border-primary-light absolute right-[10px] bottom-[10px] left-[10px] flex flex-col gap-[10px] rounded-3xl border px-[24px] py-[12px] text-white shadow-md">
                  <div className="flex items-center gap-[10px] text-[14px] lg:text-base">
                    Next Delivery
                  </div>
                  <p className="text-[14px] font-semibold lg:text-lg">
                    Kaduna South • Today
                  </p>
                  <p className="text-sm lg:text-base">
                    Order before 12pm to experience same day delivery
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Debridgers */}
      <section
        id="why-debridgers"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg font-syne relative bg-[#F6F3F3]"
      >
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg gap-3xl default-max-width mx-auto flex w-full flex-col">
          <div className="lg:gap-xl gap-md flex flex-col">
            <p className="text-primary-light text-xl tracking-widest">
              Why Debridgers
            </p>
            <h2 className="text-primary w-full max-w-[730px] text-3xl font-bold sm:text-4xl lg:text-5xl lg:font-bold">
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

      {/* Stats Section */}
      <section
        id="stats"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg font-syne bg-primary relative overflow-hidden text-white"
      >
        <div className="default-max-width relative">
          {/* Blur Dot */}
          <div className="pointer-events-none absolute inset-0 z-1">
            <BlurDot className="absolute bottom-[0%] left-[12%] h-[115px] w-[110px]" />
            <BlurDot className="absolute bottom-[50%] left-[40%] h-[115px] w-[110px]" />
            <BlurDot className="absolute bottom-[70%] left-[90%] h-[115px] w-[110px] lg:left-[70%]" />
          </div>

          {/* Stats */}
          <div className="px-section-px px sm:px-section-px-sm lg:px-section-px-lg lg:gap-4xl default-max-width relative z-10 mx-auto flex flex-col">
            <div className="font-syne pb-2xl gap-md flex flex-col">
              <p className="text-text2 text-xl tracking-[3px] uppercase">
                Early Numbers
              </p>
              <h2 className="w-full max-w-[831px] text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl lg:font-extrabold">
                People are already excited.
              </h2>
            </div>

            <div className="gap-base sm:gap-3xl grid grid-cols-3">
              {stats.map((stat, i) => {
                const displayValue = statsFormatters[i](stat.value);
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="gap-sm flex flex-col lg:w-[236px]"
                  >
                    <div className="text-secondary font-syne text-2xl leading-none font-extrabold sm:text-4xl lg:text-5xl">
                      {displayValue}
                    </div>
                    <p className="font-open-sans text-[14px] text-white sm:text-base lg:text-lg">
                      {stat.label}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Concentric Circles */}
        <div className="absolute top-[-320px] right-[-320px] z-2 h-[400px] w-[500px] rotate-127 sm:top-[-180px] sm:right-[-120px] sm:h-[400px] sm:w-[400px] lg:top-[-270px] lg:right-[-380px] lg:h-[700px] lg:w-[700px]">
          {/* Outer */}
          <div className="pointer-events-none absolute inset-0 rounded-full border-20 border-[#A5BDA8]/40" />

          {/* Middle */}
          <div className="pointer-events-none absolute inset-[40px] rounded-full border-20 border-[#A5BDA8]/40" />

          {/* Inner */}
          <div className="pointer-events-none absolute inset-[80px] rounded-full border-20 border-[#A5BDA8]/40" />
        </div>
      </section>

      {/* GetStarted Section */}
      <section
        id="get-started"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg relative overflow-hidden bg-white"
      >
        <div className="pointer-events-none absolute inset-0 z-1">
          <BlurDot className="absolute bottom-[40%] left-[12%] h-[115px] w-[110px]" />
          <BlurDot className="absolute bottom-[50%] left-[50%] h-[115px] w-[110px]" />
          <BlurDot className="absolute bottom-[70%] left-[90%] h-[115px] w-[110px] lg:left-[70%]" />
        </div>

        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg gap-xl default-max-width lg:gap-3xl relative mx-auto flex w-full flex-col items-center justify-center text-center">
          <div className="gap-md flex flex-col">
            <p className="text-primary-light font-open-sans text-center text-lg font-semibold tracking-widest lg:text-xl">
              Get started
            </p>

            <h2 className="text-primary font-syne mx-auto w-full max-w-[257px] text-center text-4xl leading-tight font-extrabold sm:max-w-[500px] lg:max-w-[831px] lg:text-5xl">
              Your first delivery is on us.
            </h2>

            <p className="text-primary font-open-sans mx-auto w-full max-w-[256px] max-w-[831px] text-base sm:max-w-[500px] lg:text-lg">
              Join early and get free delivery on your first order. Just send us
              a WhatsApp and we&apos;ll take it from there.
            </p>
          </div>

          <WhatsAppButton label="Chat with us on whatsApp" />
        </div>
      </section>

      {/* Partnership Section */}
      {/* <section
        id="partnership"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg relative bg-[#F6F3F3]"
      >
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg default-max-width mx-auto w-full">
          <div className="gap-4xl grid lg:grid-cols-2">
            {/* Left Content *
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:gap-3xl gap-xl flex flex-col"
            >
              <div className="gap-xl flex flex-col">
                <div className="bg-primary-light/80 text-primary font-open-sans border-primary gap-sm px-base inline-flex w-fit items-center rounded-full border py-1.5 text-base tracking-widest uppercase lg:text-lg">
                  Official Partnership
                </div>

                <p className="text-text font-open-sans text-base tracking-widest uppercase lg:text-lg">
                  Stronger Together
                </p>
              </div>

              <h2 className="text-text w-full text-xl leading-tight font-extrabold sm:max-w-[500px] sm:text-2xl lg:max-w-[601px] lg:text-3xl">
                Backed by those who&apos;ve been doing this longest.
              </h2>

              <p className="text-text text-base leading-relaxed lg:max-w-[570px] lg:text-lg">
                Debridgers is proudly partnering with an established agro
                marketplace that has been connecting Nigerian farmers directly
                to buyers long before we launched. Together, we bring a wider
                farmer network and deeper reach to your doorstep.
              </p>

              <a
                href="https://agrolinking.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group text-secondary hover:gap-base gap-sm inline-flex w-fit cursor-pointer items-center text-lg transition-all duration-300 ease-in-out sm:text-xl lg:text-2xl"
              >
                See what Agrolinking does
                <Icon
                  icon="lucide:arrow-right"
                  className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1"
                />
              </a>
            </motion.div>

            {/* Right: Partner Card *
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="bg-primary-light/80 flex h-fit flex-col gap-[32px] rounded-3xl px-8 py-12 text-white"
            >
              <div className="gap-base flex items-center justify-between">
                <div className="flex flex-1 flex-col truncate">
                  <div className="h-[30px] w-[130px]">
                    <img
                      src="/logos/agrolinking.png"
                      alt="Agro-Linking Logo"
                      className="block"
                    />
                  </div>

                  <div className="font-open-sans text-base text-white">
                    Farm-to-table marketplace.
                    <br />
                    Est. Nigeria.
                  </div>
                </div>

                <div className="bg-primary gap-sm flex shrink-0 items-center rounded-full px-(--space-md) py-1 text-base lg:text-lg">
                  <Icon
                    icon="lucide:check"
                    className="h-3.5 w-3.5 text-white"
                  />
                  Partner
                </div>
              </div>

              <div className="font-open-sans gap-xl flex flex-col">
                <p className="font-open-sans text-base tracking-widest text-white uppercase lg:text-lg">
                  What this means for you
                </p>

                <ul className="gap-base flex flex-col text-sm text-green-100">
                  {[
                    "Access to a larger, verified network of food directly from farm",
                    "More consistent stock — even during off-season period",
                    "Two teams, one mission — fresh food at honest prices",
                  ].map((item) => (
                    <li
                      key={item}
                      className="font-open-sans gap-md flex items-start"
                    >
                      <span
                        className="shrink-0 text-xl font-bold"
                        style={{ color: "var(--secondary-color)" }}
                      >
                        •
                      </span>
                      <span className="text-base text-white"> {item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section> */}
    </>
  );
}
