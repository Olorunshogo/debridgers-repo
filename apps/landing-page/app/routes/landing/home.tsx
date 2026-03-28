import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Header } from "../../components/Header";
import { HeroSection } from "../../components/HeroSection";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
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
      whileHover={{ y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group font-syne gap-base lg:gap-xl py-base px-3xl flex h-full cursor-default flex-col rounded-3xl transition-all duration-300 ease-in-out ${
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
            isActive ? "text-white" : "text-text group-hover:text-white"
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
  {
    title: "Vegetables",
    subtitle: "Tomatoes, Pepper, Onion",
    images: [
      "/images/deliver-vegetables-1.jpg",
      "/images/deliver-vegetables-2.jpg",
      "/images/deliver-vegetables-3.jpg",
    ],
  },
  {
    title: "Proteins",
    subtitle: "Fish, Chicken, Beef",
    images: [
      "/images/deliver-proteins-1.jpg",
      "/images/deliver-proteins-2.jpg",
      "/images/deliver-proteins-3.jpg",
    ],
  },
];

// === DeliverCard: 3 images per card, infinite auto-sliding carousel on hover
function DeliverCard({ category }: { category: DeliverCategory }) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hovered && category.images.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % category.images.length);
      }, 900);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setActiveImageIndex(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hovered, category.images.length]);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.3 }}
      className="group relative h-[320px] w-[260px] shrink-0 cursor-default overflow-hidden rounded-3xl shadow-lg"
    >
      {/* Image carousel — slides left-to-right */}
      {category.images.map((src, idx) => (
        <motion.img
          key={src}
          src={src}
          alt={`${category.title} - ${idx}`}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ x: idx === activeImageIndex ? "0%" : "100%" }}
          animate={{
            x:
              idx === activeImageIndex
                ? "0%"
                : idx < activeImageIndex
                  ? "-100%"
                  : "100%",
          }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-[#666666]/30 to-transparent" />

      {/* Label */}
      <div className="font-open-sans absolute right-0 bottom-0 left-0 flex flex-col gap-1 px-(--space-base) pb-(--space-base) text-white">
        <p className="text-lg font-semibold">{category.title}</p>
        <p className="text-base">{category.subtitle}</p>
      </div>

      {/* Hover "Order now" badge */}
      <div className="absolute top-4 right-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
        <PrimaryLink
          href="https://wa.me/+2348167042797"
          className="h-10 text-sm"
        >
          Order Now
        </PrimaryLink>
      </div>

      {/* Image dots (visible only on hover) */}
      {hovered && category.images.length > 1 && (
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

// === WhatWeDeliver: 4 cards visible on lg, infinite marquee through all 6
function WhatWeDeliver() {
  const [offset, setOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const cardWidth = 260; // w-[260px]
  const gap = 32; // gap-8 = 32px
  const step = cardWidth + gap;
  const totalCards = deliverCategories.length; // 6

  // === Auto-slide every 4 seconds (one card at a time)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setOffset((prev) => (prev + 1) % totalCards);
  //   }, 4000);

  //   return () => clearInterval(interval);
  // }, [totalCards]);
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(() => {
        setOffset((prev) => (prev + 1) % totalCards);
      }, 4000);

      return () => clearInterval(interval); // Clean up the interval when the component unmounts or when hover state changes
    }
  }, [isHovered, totalCards]);

  // const ConcentricCircles = () => {
  //   return (
  //     <div className="absolute top-[-370px] right-[-200px] h-[723px] w-[723px] rotate-[119deg]">
  //       {[0, 40, 80].map((offset, i) => (
  //         <div
  //           key={i}
  //           className="absolute rounded-full border-[20px] border-[#A5BDA8]"
  //           style={{ inset: `${offset}px` }}
  //         />
  //       ))}
  //     </div>
  //   );
  // };

  return (
    <section className="font-syne py-section-py sm:py-section-py-sm lg:py-section-py-lg relative w-full overflow-hidden bg-white">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="gap-3xl px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto flex w-full max-w-7xl flex-col"
      >
        {/* Header */}
        <div className="gap-md lg:gap-xl flex flex-col">
          <p className="text-primary-light text-xl tracking-widest">
            What we deliver
          </p>
          <h2 className="text-primary font-syne max-w-[830px] text-3xl leading-tight font-extrabold sm:text-4xl lg:max-w-1/2 lg:text-[50px] lg:font-extrabold">
            Everything you spend on at the market.
          </h2>
        </div>

        {/* Infinite Carousel Container */}
        <div className="relative">
          {/* Fade gradients */}
          {/* <div className="pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-linear-to-r from-[#666666]/30 to-transparent" />
          <div className="pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-linear-to-l from-[#666666]/0 to-transparent" /> */}
          <div className="px-lg lg:px-xl overflow-hidden">
            <motion.div
              className="flex gap-8"
              style={{
                transform: `translateX(-${offset * step}px)`,
              }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              animate={{ x: `-${offset * step}px` }}
            >
              {/* Duplicate the array for seamless infinite loop */}
              {[...deliverCategories, ...deliverCategories].map(
                (category, index) => (
                  <DeliverCard
                    key={`${category.title}-${index}`}
                    category={category}
                  />
                ),
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
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
    { title: "Debridger | Market Prices. Zero Market Stress." },
    {
      name: "description",
      content:
        "Fresh foodstuff delivered straight to your door or shop at market prices.",
    },
  ];
}

export default function Home() {
  const [activeWhyCardIndex, setActiveWhyCardIndex] = useState<number>(0);
  return (
    <>
      {/* Header */}
      <div className="top-md sticky z-50">
        <Header
          navLinks={[
            { label: "How it works", href: "#how-it-works" },
            { label: "Product", href: "#product" },
            { label: "Why Us", href: "#why-us" },
          ]}
          signUpHref="/signup"
        />
      </div>

      {/* Hero Section */}
      <div className="relative flex w-full flex-col">
        {/* Hero Section */}
        <div className="-mt-navbar-h flex min-h-0 w-full flex-1">
          <div className="from-primary -mt-navbar-h via-primary to-primary absolute inset-0 z-0 overflow-hidden bg-linear-to-b" />
          <HeroSection
            images={[
              "/images/hero-image-1.png",
              "/images/hero-image-2.png",
              "/images/hero-image-3.png",
            ]}
            servingLocation="Now Serving in Kaduna"
            headingParts={{
              top: [{ text: "Market Prices." }],
              bottom: [
                { text: "Zero " },
                { text: "Market", highlight: true },
                { text: " Stress." },
              ],
            }}
            subtext="Fresh foodstuff delivered straight to your door or shop — at the same price you'd pay at Central Market."
            secondaryCta={{ label: "See how it works ", href: "#how-it-works" }}
            trustItems={[
              { icon: "lucide:check", label: "Guarantee fresh produce" },
              {
                icon: "lucide:map-pin",
                label: "Sarbon Tasha • Narayi• Kakuri",
              },
              { icon: "lucide:tag", label: "Transparent, fixed pricing" },
              { icon: "lucide:truck", label: "Fast Delivery" },
            ]}
          />
        </div>
      </div>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg relative bg-white"
      >
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto max-w-7xl">
          <div className="grid items-center gap-(--space-4xl) lg:grid-cols-2">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="gap-3xl flex flex-col"
            >
              <div className="gap-md flex flex-col">
                <p className="text-text-colour text-[14px] font-semibold">
                  How it works
                </p>
                <h2 className="text-text text-xl leading-tight font-bold sm:text-3xl lg:text-5xl">
                  From market to your door in two steps
                </h2>
              </div>

              <div className="flex flex-col">
                {/* Step 1 */}
                <div className="py-base text-text flex gap-(--space-lg) border-b border-[#E5E7EB]">
                  <div className="font-syne flex h-9 w-9 shrink-0 items-center justify-center text-lg lg:text-xl">
                    01
                  </div>
                  <div className="flex flex-col gap-(--space-sm)">
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

                <div className="py-base text-text flex gap-(--space-lg)">
                  <div className="font-syne flex h-9 w-9 shrink-0 items-center justify-center text-lg lg:text-xl">
                    02
                  </div>
                  <div className="flex flex-col gap-(--space-sm)">
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
                  src="/images/market-woman.jpg"
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
        id="why-us"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg font-syne relative bg-[#F6F3F3]"
      >
        <div className="px-section-px sm:px-section-px-sm lg:px-section gap-3xl mx-auto flex w-full max-w-7xl flex-col">
          <div className="flex flex-col gap-(--space-md) lg:gap-(--space-xl)">
            <p className="text-primary-light text-xl tracking-widest">
              Why Debridger
            </p>
            <h2 className="text-primary w-full max-w-[730px] text-3xl font-bold sm:text-4xl lg:text-5xl lg:font-extrabold">
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
      <section className="py-section-py sm:py-section-py-sm lg:py-section-py-lg font-syne bg-primary relative overflow-hidden text-white">
        {/* <div className="pointer-events-none absolute top-8 right-8 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-24 bottom-16 h-80 w-80 rounded-full border border-white/10" /> */}

        <div className="px-section-px z-10-px sm:px-section-px-sm lg:px-section-px-lg lg:gap-4xl relative mx-auto flex max-w-7xl flex-col">
          <div className="font-syne pb-2xl flex flex-col gap-(--space-md)">
            <p className="text-text2 text-xl tracking-[3px] uppercase">
              Early Numbers
            </p>
            <h2 className="w-full max-w-[831px] text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl lg:font-extrabold">
              People are already excited.
            </h2>
          </div>

          <div className="gap-base grid grid-cols-3 sm:gap-(--space-3xl)">
            {stats.map((stat, i) => {
              const displayValue = statsFormatters[i](stat.value);
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col gap-(--space-sm) lg:w-[236px]"
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

        {/* Concentric Circles */}
        <div className="absolute top-[-320px] right-[-320px] z-2 h-[400px] w-[500px] rotate-[127deg] sm:top-[-180px] sm:right-[-120px] sm:h-[400px] sm:w-[400px] lg:top-[-270px] lg:right-[-380px] lg:h-[700px] lg:w-[700px]">
          {/* Outer */}
          <div className="pointer-events-none absolute inset-0 rounded-full border-[20px] border-[#A5BDA8]/40" />

          {/* Middle */}
          <div className="pointer-events-none absolute inset-[40px] rounded-full border-[20px] border-[#A5BDA8]/40" />

          {/* Inner */}
          <div className="pointer-events-none absolute inset-[80px] rounded-full border-[20px] border-[#A5BDA8]/40" />
        </div>
      </section>

      {/* GetStarted Section */}
      <section className="py-section-py sm:py-section-py-sm lg:py-section-py-lg relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-16 left-1/4 h-80 w-80 rounded-full bg-green-100 opacity-60 blur-3xl" />
          <div className="absolute right-1/4 bottom-8 h-72 w-72 rounded-full bg-amber-100 opacity-50 blur-3xl" />
        </div>

        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg gap-xl relative mx-auto flex w-full flex-col items-center justify-center text-center lg:gap-(--space-3xl)">
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
      <section className="relativepy-section-py sm:py-section-py-sm lg:py-section-py-lg bg-[#F6F3F3]">
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto w-full max-w-7xl">
          <div className="grid gap-(--space-4xl) lg:grid-cols-2">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:gap-3xl gap-xl flex flex-col"
            >
              <div className="gap-xl flex flex-col">
                <div className="bg-primary-light text-primary font-open-sans border-primary inline-flex w-fit items-center gap-(--space-sm) rounded-full border border-1 px-(--space-base) py-1.5 text-base tracking-widest uppercase lg:text-lg">
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
                Debridger is proudly partnering with an established agro
                marketplace that has been connecting Nigerian farmers directly
                to buyers long before we launched. Together, we bring a wider
                farmer network and deeper reach to your doorstep.
              </p>

              <a
                href="https://agrolinking.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group text-secondary inline-flex w-fit cursor-pointer items-center gap-(--space-sm) text-lg transition-all duration-300 ease-in-out hover:gap-(--space-base) sm:text-xl lg:text-2xl"
              >
                See what Agrolinking does
                <Icon
                  icon="lucide:arrow-right"
                  className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1"
                />
              </a>
            </motion.div>

            {/* Right: Partner Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="bg-primary-light flex h-full max-h-[352px] flex-col gap-[32px] rounded-3xl px-8 py-12 text-white"
            >
              <div className="flex items-center justify-between gap-(--space-base)">
                <div className="flex flex-col gap-(--space-sm)">
                  <div className="h-[23px] w-[123px]">
                    <img src="/agroLinking-logo.png" alt="Agro-Linking Logo" />
                  </div>

                  <div className="font-open-sans text-base text-white">
                    Farm-to-table marketplace.
                    <br />
                    Est. Nigeria.
                  </div>
                </div>

                <div className="bg-primary flex shrink-0 items-center gap-(--space-md) rounded-full px-(--space-base) py-1 text-base lg:text-lg">
                  <Icon
                    icon="lucide:check"
                    className="h-3.5 w-3.5 text-white"
                  />
                  Partner
                </div>
              </div>

              <div className="font-open-sans flex flex-col gap-(--space-xl)">
                <p className="font-open-sans text-base tracking-widest text-white uppercase lg:text-lg">
                  What this means for you
                </p>

                <ul className="flex flex-col gap-(--space-base) text-sm text-green-100">
                  {[
                    "Access to a larger, verified network of food directly from farm",
                    "More consistent stock — even during off-season period",
                    "Two teams, one mission — fresh food at honest prices",
                  ].map((item) => (
                    <li
                      key={item}
                      className="font-open-sans flex items-center gap-(--space-md)"
                    >
                      <span
                        className="mt-0.5 shrink-0"
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
      </section>
    </>
  );
}
