import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { HeroSection } from "../components/HeroSection";
import {
  CheckCircle,
  MapPin,
  Tag,
  Truck,
  ArrowRight,
  Check,
  Shield,
  Smartphone,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const stats = [
  { value: "92%", label: "resident of Kaduna are using us." },
  { value: "1000+", label: "areas in Kaduna South we serve" },
  { value: "0", label: "hidden fees — ever" },
];

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
  return (
    <>
      {/* Hero Section */}
      <div className="relative">
        <Header
          navLinks={[
            { label: "How it works", href: "#how-it-works" },
            { label: "Product", href: "#product" },
            { label: "Why Us", href: "#why-us" },
          ]}
          signUpHref="https://wa.me/+2347012288798"
        />
        <HeroSection
          images={[
            "/images/hero-image-1.png",
            "/images/hero-image-2.png",
            "/images/hero-image-3.png",
          ]}
          servingLocation="Now Serving in Kaduna"
          headingParts={[
            { text: "Market Prices.\n" },
            { text: "Zero " },
            { text: "Market", highlight: true },
            { text: " Stress." },
          ]}
          subtext="Fresh foodstuff delivered straight to your door or shop — at the same price you'd pay at Central Market."
          secondaryCta={{ label: "See how it works →", href: "#how-it-works" }}
          trustItems={[
            { icon: CheckCircle, label: "Guarantee fresh produce" },
            { icon: MapPin, label: "Sarbon Tasha • Narayi • Kakuri" },
            { icon: Tag, label: "Transparent, fixed pricing" },
            { icon: Truck, label: "Fast Delivery" },
          ]}
        />
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p
                className="text-sm font-semibold tracking-widest uppercase"
                style={{ color: "var(--color-primary)" }}
              >
                How it works
              </p>

              <h2 className="mt-3 text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
                From market to your
                <br />
                door in two steps
              </h2>

              <div className="mt-12 space-y-10">
                {/* Step 1 */}
                <div className="flex gap-5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    01
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Send us your order
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-gray-600">
                      Chat on WhatsApp, call, or browse our catalog. Tell us
                      what you need — rice, beans, palm oil, anything.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    02
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Delivered to you
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-gray-600">
                      Your order arrives at your home or shop at the market
                      price you agreed. No surprises, no hidden fees.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Image + Delivery Card */}
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
                  className="absolute right-5 bottom-5 left-5 rounded-2xl p-5 text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-green-300">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                    Next Delivery
                  </div>
                  <p className="mt-1 text-xl font-semibold">
                    Kaduna South • Today
                  </p>
                  <p className="mt-3 text-sm text-green-200">
                    Order before 12pm to experience same day delivery
                  </p>
                </div>
              </div>

              {/* Brand circles overlay */}
              <div className="absolute -top-4 -right-4 flex gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white shadow-lg">
                  S
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  A
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Debridgers */}
      <section id="why-us" className="bg-[#F4F7F5] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <p
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: "var(--color-primary)" }}
            >
              Why Debridger
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900 lg:text-5xl">
              We solve what the market can&apos;t.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 - Fixed Prices (always green) */}
            <motion.div
              whileHover={{ y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex h-full cursor-pointer flex-col rounded-3xl p-8 text-white transition-all duration-300 ease-in-out"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Fixed, fair prices</h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-green-100">
                No more guessing what rice costs today. Our prices are set
                weekly and always reflect real market rates — nothing more.
              </p>
            </motion.div>

            {/* Card 2 - Quality Guaranteed (white → green on hover) */}
            <motion.div
              whileHover={{ y: -10, backgroundColor: "var(--color-primary)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="group flex h-full cursor-pointer flex-col rounded-3xl border border-gray-200 bg-white p-8 transition-all duration-300 ease-in-out"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700 transition-all duration-300 ease-in-out group-hover:bg-white/20 group-hover:text-white">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 transition-colors duration-300 ease-in-out group-hover:text-white">
                Quality guaranteed
              </h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-gray-600 transition-colors duration-300 ease-in-out group-hover:text-green-100">
                If you&apos;re not satisfied, we replace the orders. No
                questions asked. Our reputation depends on what lands at your
                door.
              </p>
            </motion.div>

            {/* Card 3 - Order Your Way (white → green on hover) */}
            <motion.div
              whileHover={{ y: -10, backgroundColor: "var(--color-primary)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="group flex h-full cursor-pointer flex-col rounded-3xl border border-gray-200 bg-white p-8 transition-all duration-300 ease-in-out"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700 transition-all duration-300 ease-in-out group-hover:bg-white/20 group-hover:text-white">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 transition-colors duration-300 ease-in-out group-hover:text-white">
                Order your way
              </h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-gray-600 transition-colors duration-300 ease-in-out group-hover:text-green-100">
                WhatsApp, phone call, or app — whatever is easiest for you. No
                complex platforms, no downloads required to get started.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Deliver */}

      {/* GetStarted Section */}
      <section className="relative overflow-hidden bg-white py-24">
        {/* Soft glowing background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-16 left-1/4 h-80 w-80 rounded-full bg-green-100 opacity-60 blur-3xl" />
          <div className="absolute right-1/4 bottom-8 h-72 w-72 rounded-full bg-amber-100 opacity-50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--color-primary)" }}
          >
            Get started
          </p>

          <h2 className="mt-4 text-4xl leading-tight font-bold text-gray-900 md:text-6xl">
            Your first
            <br />
            delivery is on us.
          </h2>

          <p className="mx-auto mt-6 max-w-md text-lg text-gray-600">
            Join early and get free delivery on your first order. Just send us a
            WhatsApp and we&apos;ll take it from there.
          </p>

          {/* Purple brand circle */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="absolute -top-4 right-10 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 shadow-xl md:right-16"
          >
            <span className="text-xl font-bold text-white">S</span>
          </motion.div>

          {/* WhatsApp Button */}
          <motion.a
            href="https://wa.me/2347012288798"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="mt-10 inline-flex cursor-pointer items-center gap-3 rounded-full px-10 py-4 text-base font-semibold text-black shadow-lg transition-all duration-300 ease-in-out"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            <MessageCircle className="h-5 w-5" />
            Chat with us on WhatsApp
          </motion.a>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className="relative overflow-hidden py-20 text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {/* Decorative rings */}
        <div className="pointer-events-none absolute top-8 right-8 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-24 bottom-16 h-80 w-80 rounded-full border border-white/10" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-12">
            <p
              className="text-xs font-semibold tracking-[3px] uppercase"
              style={{ color: "var(--color-secondary)" }}
            >
              Early Numbers
            </p>
            <h2 className="mt-3 text-4xl leading-tight font-bold lg:text-5xl">
              People are already excited.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div
                  className="text-6xl leading-none font-extrabold lg:text-7xl"
                  style={{ color: "var(--color-secondary)" }}
                >
                  {stat.value}
                </div>
                <p className="mt-3 text-base text-green-200">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="bg-[#F4F7F5] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
                style={{
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary)",
                }}
              >
                Official Partnership
              </div>

              <p className="mt-2 text-sm font-semibold tracking-widest text-gray-500 uppercase">
                Stronger Together
              </p>

              <h2 className="mt-3 text-4xl leading-tight font-bold text-gray-900 lg:text-5xl">
                Backed by those who&apos;ve been doing this longest.
              </h2>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600">
                Debridger is proudly partnering with an established agro
                marketplace that has been connecting Nigerian farmers directly
                to buyers long before we launched. Together, we bring a wider
                farmer network and deeper reach to your doorstep.
              </p>

              <Link
                to="/agrolinking"
                className="group mt-8 inline-flex cursor-pointer items-center gap-2 font-semibold transition-all duration-300 ease-in-out hover:gap-3"
                style={{ color: "var(--color-secondary)" }}
              >
                See what Agrolinking does
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
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
                className="h-full rounded-3xl p-8 text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-bold">
                      agr
                      <span style={{ color: "var(--color-secondary)" }}>o</span>
                      linking
                    </div>
                    <div className="mt-1 text-sm text-green-300">
                      Farm-to-table marketplace.
                      <br />
                      Est. Nigeria.
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-700/60 px-4 py-1.5 text-sm font-medium">
                    <Check className="h-3.5 w-3.5 text-green-300" />
                    Partner
                  </div>
                </div>

                <div>
                  <p className="mb-4 text-xs font-semibold tracking-widest text-green-400 uppercase">
                    What this means for you
                  </p>

                  <ul className="space-y-4 text-sm text-green-100">
                    {[
                      "Access to a larger, verified network of food directly from farm",
                      "More consistent stock — even during off-season period",
                      "Two teams, one mission — fresh food at honest prices",
                    ].map((item) => (
                      <li key={item} className="flex gap-3">
                        <span
                          className="mt-0.5 shrink-0"
                          style={{ color: "var(--color-secondary)" }}
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
