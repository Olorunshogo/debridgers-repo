import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import type { Variants } from "framer-motion";
import { Header } from "../../components/Header";
import { HeroSection } from "../../components/HeroSection";

export function meta() {
  return [
    { title: "Become an Agent | Debridger" },
    {
      name: "description",
      content:
        "Join Debridger as a field agent. Earn 30% commission on every sale, work flexibly, and serve your community.",
    },
  ];
}

interface WhatYouDoCard {
  icon: string;
  title: string;
  description: string;
}

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  number: string;
  title: string;
  description: string;
}

const whatYouDoCards: WhatYouDoCard[] = [
  {
    icon: "lucide:package-search",
    title: "Source Products",
    description:
      "Connect buyers with fresh foodstuff from verified local markets. You know your area — we give you the tools.",
  },
  {
    icon: "lucide:truck",
    title: "Manage Deliveries",
    description:
      "Coordinate pickups and drop-offs in your zone. You set your schedule, we handle the orders.",
  },
  {
    icon: "lucide:banknote",
    title: "Earn Commissions",
    description:
      "Get 30% of every sale you close. The more you sell, the more you earn — paid weekly, no delays.",
  },
];

const benefits: BenefitItem[] = [
  {
    icon: "lucide:clock",
    title: "Flexible hours",
    description: "Work when it suits you. Morning, afternoon, or evening.",
  },
  {
    icon: "lucide:wallet",
    title: "Weekly payouts",
    description: "Commissions paid every week, directly to your account.",
  },
  {
    icon: "lucide:graduation-cap",
    title: "Free training",
    description: "We onboard you fully — no prior experience needed.",
  },
  {
    icon: "lucide:map-pin",
    title: "Kaduna-based",
    description: "Serve your own neighbourhood. No long-distance travel.",
  },
  {
    icon: "lucide:shield-check",
    title: "Verified & trusted",
    description: "Work under the Debridger brand — buyers already trust us.",
  },
  {
    icon: "lucide:trending-up",
    title: "Grow with us",
    description: "Top agents get priority orders and higher targets over time.",
  },
];

const steps: Step[] = [
  {
    number: "01",
    title: "Apply",
    description:
      "Fill in your details and optionally upload your CV. Takes less than 3 minutes.",
  },
  {
    number: "02",
    title: "Get Approved",
    description:
      "Our team reviews your application within 48 hours. You'll get an email with your login credentials.",
  },
  {
    number: "03",
    title: "Start Earning",
    description:
      "Log in to your agent dashboard, receive orders, and start earning 30% on every sale.",
  },
];

const earningsRows = [
  { label: "Sales closed", value: "5 orders", highlight: false },
  { label: "Total sale amount", value: "₦75,000", highlight: false },
  { label: "Your commission (30%)", value: "₦22,500", highlight: true },
  { label: "Company keeps (70%)", value: "₦52,500", highlight: false },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function AgentsPage() {
  const [activeStep, setActiveStep] = useState(0);

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
          signUpHref="/signup?role=agent"
        />
      </div>

      {/* Hero */}
      <div className="relative flex w-full flex-col">
        <div className="-mt-navbar-h flex min-h-0 w-full flex-1">
          <div className="from-primary -mt-navbar-h via-primary to-primary absolute inset-0 z-0 overflow-hidden bg-linear-to-b" />
          <HeroSection
            images={["/images/hero-1.jpg"]}
            servingLocation="Now Hiring in Kaduna"
            headingParts={{
              top: [{ text: "Earn While You" }],
              bottom: [
                { text: "Serve Your " },
                { text: "Community", highlight: true },
                { text: "." },
              ],
            }}
            subtext="Become a Debridger field agent. Source fresh foodstuff, manage deliveries, and earn 30% commission on every sale — on your own schedule."
            secondaryCta={{ label: "Apply Now", href: "#apply-now" }}
            trustItems={[
              { icon: "lucide:wallet", label: "30% commission per sale" },
              { icon: "lucide:clock", label: "Flexible working hours" },
              {
                icon: "lucide:graduation-cap",
                label: "Free onboarding & training",
              },
              { icon: "lucide:map-pin", label: "Kaduna South — local routes" },
            ]}
          />
        </div>
      </div>

      {/* What You Do / Your Role */}
      <section className="py-section-py sm:py-section-py-sm lg:py-section-py-lg bg-white">
        <div className="default-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <div className="gap-3xl flex flex-col">
            {/* Role Title */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="gap-md flex flex-col"
            >
              <p className="text-primary-light text-xl tracking-widest">
                Your role
              </p>
              <h2 className="font-syne text-primary w-full max-w-[730px] text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                What you&apos;ll do as an agent
              </h2>
            </motion.div>

            {/* Role Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {whatYouDoCards.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i + 1}
                  variants={fadeUp}
                  className="flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md"
                  style={{ borderColor: "var(--border-gray)" }}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "var(--bg-light)" }}
                  >
                    <Icon
                      icon={card.icon}
                      className="h-6 w-6"
                      style={{ color: "var(--primary-color)" }}
                    />
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3
                      className="font-syne text-lg font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {card.title}
                    </h3>
                    <p
                      className="font-open-sans text-base leading-relaxed"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {card.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Us / Benefits */}
      <section
        id="benefits"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg"
        style={{ backgroundColor: "var(--bg-light)" }}
      >
        <div className="default-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <div className="gap-3xl flex flex-col">
            {/* Why Join Us Title */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="gap-md flex flex-col"
            >
              <p className="text-primary-light text-xl tracking-widest">
                Why join us
              </p>
              <h2 className="font-syne text-primary max-w-[730px] text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Built for people who hustle.
              </h2>
            </motion.div>

            {/* Why Joing Us Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b, i) => (
                <motion.div
                  key={b.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i + 1}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 ease-in-out hover:scale-105"
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: "var(--dash-quick-action-hover)",
                    }}
                  >
                    <Icon
                      icon={b.icon}
                      className="h-5 w-5"
                      style={{ color: "var(--primary-color)" }}
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3
                      className="font-syne text-base font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {b.title}
                    </h3>
                    <p
                      className="font-open-sans text-sm leading-relaxed"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {b.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Process / How It Works */}
      <section
        id="how-it-works"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg bg-white"
      >
        <div className="default-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <div className="gap-3xl flex flex-col">
            {/* Heading */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="gap-md flex flex-col"
            >
              <p className="text-primary-light text-xl tracking-widest">
                The process
              </p>
              <h2 className="font-syne text-primary max-w-[730px] text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                Three steps to your first commission.
              </h2>
            </motion.div>

            {/* Cards */}
            <div className="grid gap-6 lg:grid-cols-3">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i + 1}
                  variants={fadeUp}
                  onHoverStart={() => setActiveStep(i)}
                  className="relative flex flex-col gap-4 rounded-2xl border-2 p-8 transition-all duration-300"
                  style={{
                    borderColor:
                      activeStep === i
                        ? "var(--primary-color)"
                        : "var(--border-gray)",
                    backgroundColor:
                      activeStep === i
                        ? "var(--dash-quick-action-hover)"
                        : "var(--white)",
                  }}
                >
                  <span
                    className="font-syne text-5xl leading-none font-extrabold"
                    style={{
                      color:
                        activeStep === i
                          ? "var(--primary-color)"
                          : "var(--border-gray)",
                    }}
                  >
                    {step.number}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3
                      className="font-syne text-xl font-bold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="font-open-sans text-base leading-relaxed"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Example Earnings / Earnings Snapshot */}
      <section
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <div className="default-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <div className="gap-3xl grid items-center lg:grid-cols-2">
            {/* Heading */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="gap-md flex flex-col"
            >
              <p className="text-xl tracking-widest text-white/60">
                Example earnings
              </p>
              <h2 className="font-syne max-w-[730px] text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                What a good week looks like.
              </h2>
              <p className="font-open-sans max-w-[560px] text-lg leading-relaxed text-white/80">
                Agents who stay consistent typically close 5–10 sales per week.
                Here&apos;s what that means in your pocket.
              </p>
            </motion.div>

            {/* Earnings Board */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm"
            >
              <div className="flex flex-col gap-4">
                {earningsRows.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between py-3 ${
                      i < earningsRows.length - 1
                        ? "border-b border-white/20"
                        : ""
                    }`}
                  >
                    <span className="font-open-sans text-base text-white/70">
                      {row.label}
                    </span>
                    <span
                      className="font-syne text-lg font-bold"
                      style={{
                        color: row.highlight
                          ? "var(--secondary-color)"
                          : "white",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/50">
                * Based on ₦15,000 average order value. Actual earnings vary.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section
        id="apply-now"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg bg-white"
      >
        <div className="default-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="flex flex-col items-center gap-6 text-center"
          >
            <p className="text-primary-light font-open-sans text-xl tracking-widest">
              Ready to start?
            </p>
            <h2 className="font-syne text-primary mx-auto max-w-[730px] text-3xl font-extrabold sm:text-4xl lg:text-5xl">
              Apply in under 3 minutes.
            </h2>
            <p className="font-open-sans text-text mx-auto max-w-[550px] text-lg leading-relaxed">
              No experience required. Just bring your hustle — we&apos;ll handle
              the rest.
            </p>
            <Link
              to="/signup?role=agent"
              className="font-syne inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              Apply Now
              <Icon icon="lucide:arrow-right" className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
