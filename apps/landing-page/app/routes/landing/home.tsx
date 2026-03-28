import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Header } from "../../components/Header";
import { HeroSection } from "../../components/HeroSection";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";

// === Why Debridgers
interface WhyCardData {
  icon: string;
  title: string;
  description: string;
}

const whyCardsData: WhyCardData[] = [
  {
    icon: "lucide:shield",
    title: "Fixed, fair prices",
    description:
      "No more guessing what rice costs today. Our prices are set weekly and always reflect real market rates — nothing more.",
  },
  {
    icon: "lucide:check-circle",
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
      className={`group flex h-full cursor-default flex-col gap-8 rounded-3xl p-6 transition-all duration-300 ease-in-out ${
        isActive
          ? "bg-primary text-white"
          : "border-gray hover:border-primary border bg-white"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
          isActive
            ? "bg-white/20 text-white"
            : "bg-primary/20 text-primary/70 group-hover:bg-white/20 group-hover:text-white"
        }`}
      >
        <Icon icon={card.icon} className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        <h3
          className={`text-xl font-bold transition-colors duration-300 ${
            isActive ? "text-white" : "text-gray-900 group-hover:text-white"
          }`}
        >
          {card.title}
        </h3>
        <p
          className={`flex-1 text-base leading-relaxed transition-colors duration-300 ${
            isActive
              ? "text-emerald-100"
              : "text-gray-600 group-hover:text-emerald-100"
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
      "/images/hero-image-1.png",
      "/images/hero-image-2.png",
      "/images/hero-image-3.png",
    ],
  },
  {
    title: "Grains",
    subtitle: "Beans",
    images: [
      "/images/hero-image-2.png",
      "/images/hero-image-3.png",
      "/images/hero-image-1.png",
    ],
  },
  {
    title: "Oil & Protein",
    subtitle: "Groundnut oil, Palm Oil",
    images: [
      "/images/hero-image-3.png",
      "/images/hero-image-1.png",
      "/images/hero-image-2.png",
    ],
  },
  {
    title: "Tubers",
    subtitle: "Yam, Potato",
    images: [
      "/images/market-woman.jpg",
      "/images/hero-image-1.png",
      "/images/hero-image-2.png",
    ],
  },
  {
    title: "Vegetables",
    subtitle: "Tomatoes, Pepper, Onion",
    images: [
      "/images/hero-image-2.png",
      "/images/market-woman.jpg",
      "/images/hero-image-3.png",
    ],
  },
  {
    title: "Proteins",
    subtitle: "Fish, Chicken, Beef",
    images: [
      "/images/hero-image-3.png",
      "/images/hero-image-2.png",
      "/images/market-woman.jpg",
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
      className="group relative h-[320px] w-[260px] shrink-0 cursor-pointer overflow-hidden rounded-3xl shadow-lg"
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
      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />

      {/* Label */}
      <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-(--space-sm) p-(--space-base) transition-transform duration-300 ease-in-out group-hover:-translate-y-2">
        <p className="text-sm font-bold text-white">{category.title}</p>
        <p className="text-xs text-white/70">{category.subtitle}</p>
      </div>

      {/* Hover badge */}
      {/* <div
        className="top-md right-md absolute rounded-full px-(--space-md) py-1 text-xs font-semibold text-white opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"
        style={{ backgroundColor: "var(--secondary-color)" }}
      >
        Order now
      </div> */}
      {/* Hover "Order now" badge */}
      <div className="absolute top-4 right-4 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
        Order now
      </div>

      {/* Image indicator dots */}
      {/* {hovered && (
        <div className="absolute top-(--space-md) right-0 left-0 flex justify-center gap-(--space-sm)">
          {images.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i === activeIndex
                    ? "var(--secondary-color)"
                    : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>
      )} */}
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
  const [offset, setOffset] = useState(0);
  const cardWidth = 260; // w-[260px]
  const gap = 32; // gap-8 = 32px
  const step = cardWidth + gap;
  const totalCards = deliverCategories.length; // 6

  // === Auto-slide every 4 seconds (one card at a time)
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % totalCards);
    }, 4000);

    return () => clearInterval(interval);
  }, [totalCards]);

  return (
    <section className="w-full overflow-hidden bg-white py-20">
      <div className="gap-3xl px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto flex w-full max-w-7xl flex-col">
        {/* Header */}
        <div className="gap-md flex flex-col">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase">
            What we deliver
          </p>
          <h2 className="text-primary text-4xl leading-tight font-bold lg:max-w-1/2 lg:text-5xl">
            Everything you spend on at the market.
          </h2>
        </div>

        {/* Infinite Carousel Container */}
        <div className="relative">
          {/* Fade gradients */}
          <div className="pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-gradient-to-l from-white to-transparent" />

          {/* Viewport - shows exactly 4 cards on lg+ */}
          <div className="px-lg lg:px-xl overflow-hidden">
            <motion.div
              className="flex gap-8"
              style={{
                transform: `translateX(-${offset * step}px)`,
              }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }} // smooth cubic-bezier
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
const stats = [
  { value: "92%", label: "resident of Kaduna are using us." },
  { value: "1000+", label: "areas in Kaduna South we serve" },
  { value: "0", label: "hidden fees — ever" },
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
      {/* Hero Section */}
      <div className="relative flex min-h-screen w-full flex-col">
        {/* Header */}
        <div className="absolute w-full">
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
        <div className="flex min-h-0 w-full flex-1">
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
      <section id="how-it-works" className="py-section-py-lg bg-white">
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto max-w-7xl">
          <div className="grid items-center gap-(--space-4xl) lg:grid-cols-2">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="gap-base flex flex-col"
            >
              <p
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: "var(--primary-color)" }}
              >
                How it works
              </p>

              <div className="gap-3xl flex flex-col">
                <h2 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
                  From market to your door in two steps
                </h2>

                <div className="flex flex-col">
                  {/* Step 1 */}
                  <div className="border-gray py-base flex gap-(--space-lg) border-b">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-gray-900">
                      01
                    </div>
                    <div className="flex flex-col gap-(--space-sm)">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Send us your order
                      </h3>
                      <p className="text-base leading-relaxed text-gray-600">
                        Chat on WhatsApp, call, or browse our catalog. Tell us
                        what you need — rice, beans, palm oil, anything.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="py-base flex gap-(--space-lg)">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-gray-900">
                      02
                    </div>
                    <div className="flex flex-col gap-(--space-sm)">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Delivered to you
                      </h3>
                      <p className="text-base leading-relaxed text-gray-600">
                        Your order arrives at your home or shop at the market
                        price you agreed. No surprises, no hidden fees.
                      </p>
                    </div>
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
                  className="h-auto w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                />
                {/* Delivery Info Card */}
                <div
                  className="absolute right-(--space-xl) bottom-(--space-xl) left-(--space-xl) flex flex-col gap-(--space-sm) rounded-2xl p-(--space-xl) text-white"
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  <div className="flex items-center gap-(--space-sm) text-sm font-medium text-green-300">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                    Next Delivery
                  </div>
                  <p className="text-xl font-semibold">Kaduna South • Today</p>
                  <p className="text-sm text-green-200">
                    Order before 12pm to experience same day delivery
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Debridgers */}
      <section id="why-us" className="bg-bg-light py-section-py-lg">
        <div className="px-section-px sm:px-section-px-sm lg:px-section gap-3xl mx-auto flex w-full max-w-7xl flex-col">
          <div className="flex flex-col items-center gap-(--space-base) text-center">
            <p
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: "var(--primary-color)" }}
            >
              Why Debridger
            </p>
            <h2 className="text-4xl font-bold text-gray-900 lg:text-5xl">
              We solve what the market can&apos;t.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
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

      {/* GetStarted Section */}
      <section className="py-section-py-lg relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-16 left-1/4 h-80 w-80 rounded-full bg-green-100 opacity-60 blur-3xl" />
          <div className="absolute right-1/4 bottom-8 h-72 w-72 rounded-full bg-amber-100 opacity-50 blur-3xl" />
        </div>

        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg relative mx-auto flex w-full flex-col items-center justify-center gap-(--space-3xl) text-center">
          <p
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--primary-color)" }}
          >
            Get started
          </p>

          <h2 className="text-4xl leading-tight font-bold text-gray-900 lg:text-6xl">
            Your first
            <br />
            delivery is on us.
          </h2>

          <p className="max-w-[500px] text-lg text-gray-600">
            Join early and get free delivery on your first order. Just send us a
            WhatsApp and we&apos;ll take it from there.
          </p>

          <motion.a
            href="https://wa.me/2347012288798"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex cursor-pointer items-center gap-(--space-md) rounded-full px-10 py-(--space-base) text-base font-semibold text-black shadow-lg transition-all duration-300 ease-in-out"
            style={{ backgroundColor: "var(--secondary-color)" }}
          >
            <Icon icon="logos:whatsapp-icon" className="h-5 w-5" />
            Chat with us on WhatsApp
          </motion.a>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className="py-section-py-lg relative overflow-hidden text-white"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <div className="pointer-events-none absolute top-8 right-8 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-24 bottom-16 h-80 w-80 rounded-full border border-white/10" />

        <div className="px-section sm:px-section-px-sm lg:px-section-px-lg relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-(--space-base)">
            <p
              className="text-xs font-semibold tracking-[3px] uppercase"
              style={{ color: "var(--secondary-color)" }}
            >
              Early Numbers
            </p>
            <h2 className="text-4xl leading-tight font-bold lg:text-5xl">
              People are already excited.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-(--space-3xl) sm:grid-cols-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-(--space-sm)"
              >
                <div
                  className="text-6xl leading-none font-extrabold lg:text-7xl"
                  style={{ color: "var(--secondary-color)" }}
                >
                  {stat.value}
                </div>
                <p className="text-base text-green-200">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="bg-bg-light py-section-py-lg">
        <div className="px-section sm:px-section-px-sm lg:px-section-px-lg mx-auto w-full max-w-7xl">
          <div className="grid items-start gap-(--space-4xl) lg:grid-cols-12">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-(--space-xl) lg:col-span-7"
            >
              <div
                className="inline-flex w-fit items-center gap-(--space-sm) rounded-full border px-(--space-base) py-1.5 text-xs font-semibold tracking-widest uppercase"
                style={{
                  borderColor: "var(--primary-color)",
                  color: "var(--primary-color)",
                }}
              >
                Official Partnership
              </div>

              <div className="flex flex-col gap-(--space-base)">
                <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase">
                  Stronger Together
                </p>
                <h2 className="text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
                  Backed by those who&apos;ve been doing this longest.
                </h2>
                <p className="max-w-[700px] text-base leading-relaxed text-gray-600">
                  Debridger is proudly partnering with an established agro
                  marketplace that has been connecting Nigerian farmers directly
                  to buyers long before we launched. Together, we bring a wider
                  farmer network and deeper reach to your doorstep.
                </p>
              </div>

              <Link
                to="/agrolinking"
                className="group inline-flex w-fit cursor-pointer items-center gap-(--space-sm) font-semibold transition-all duration-300 ease-in-out hover:gap-(--space-base)"
                style={{ color: "var(--secondary-color)" }}
              >
                See what Agrolinking does
                <Icon
                  icon="lucide:arrow-right"
                  className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1"
                />
              </Link>
            </motion.div>

            {/* Right: Partner Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:col-span-5"
            >
              <div
                className="flex h-full flex-col gap-(--space-2xl) rounded-3xl p-8 text-white"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                <div className="flex items-start justify-between gap-(--space-base)">
                  <div className="flex flex-col gap-(--space-sm)">
                    <div className="text-xl font-bold">
                      agr
                      <span style={{ color: "var(--secondary-color)" }}>o</span>
                      linking
                    </div>
                    <div className="text-sm text-green-300">
                      Farm-to-table marketplace.
                      <br />
                      Est. Nigeria.
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-(--space-sm) rounded-full bg-green-700/60 px-(--space-base) py-1.5 text-sm font-medium">
                    <Icon
                      icon="lucide:check"
                      className="h-3.5 w-3.5 text-green-300"
                    />
                    Partner
                  </div>
                </div>

                <div className="flex flex-col gap-(--space-base)">
                  <p className="text-xs font-semibold tracking-widest text-green-400 uppercase">
                    What this means for you
                  </p>

                  <ul className="flex flex-col gap-(--space-base) text-sm text-green-100">
                    {[
                      "Access to a larger, verified network of food directly from farm",
                      "More consistent stock — even during off-season period",
                      "Two teams, one mission — fresh food at honest prices",
                    ].map((item) => (
                      <li key={item} className="flex gap-(--space-md)">
                        <span
                          className="mt-0.5 shrink-0"
                          style={{ color: "var(--secondary-color)" }}
                        >
                          •
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
