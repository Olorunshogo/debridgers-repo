import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import type { Variants } from "framer-motion";
import { buildPageMeta } from "../../lib/seo";
import { Header } from "../../components/marketing/Header";
import { HeroSection } from "../../components/marketing/HeroSection";
import { useAuth } from "@debridgers/ui-web";
import { usePlatformConfig } from "../../contexts/PlatformConfigContext";
import { formatCurrency } from "@debridgers/ui-web";

import { marketingNavLinks } from "@/components/marketing/data/data";
/*
 * No commission figure in the metadata. The rate is an admin setting that can
 * change at any time, and meta() is static - it previously advertised a fixed
 * rate in the page title and social cards, which became a false claim the
 * moment the rate was changed.
 */
export function meta() {
  return buildPageMeta({
    title: "Become a Debridgers Agent | Earn Commission in Kaduna",
    description:
      "Earn commission on every sale as a Debridgers field agent. Work flexibly, serve your community and get paid weekly. Apply in under 3 minutes.",
    path: "/agents",
    keywords: [
      "Debridgers agent Kaduna",
      "earn commission food delivery Nigeria",
      "field agent job Kaduna",
      "flexible work Kaduna",
      "food delivery agent Nigeria",
      "commission sales agent",
    ],
    imageAlt: "Debridgers — become a field agent and earn commission in Kaduna",
  });
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
      "Connect buyers with fresh foodstuff from verified local markets. You know your area - we give you the tools.",
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
      "Get commission on every sale you close. The more you sell, the more you earn — paid weekly, no delays.",
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
    description: "We onboard you fully - no prior experience needed.",
  },
  {
    icon: "lucide:map-pin",
    title: "Kaduna-based",
    description: "Serve your own neighbourhood. No long-distance travel.",
  },
  {
    icon: "lucide:shield-check",
    title: "Verified & trusted",
    description: "Work under the Debridgers brand - buyers already trust us.",
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
      "Log in to your agent dashboard, receive orders, and start earning commission on every sale.",
  },
];

/*
 * Illustration for the recruitment page, not a quote. The real money rule is
 * the commission rate, which comes from platform config and is applied below;
 * the order value and count here are just a representative scenario, kept as
 * named constants so the table and its footnote cannot drift apart.
 */
const ILLUSTRATION_ORDERS = 5;
const ILLUSTRATION_ORDER_VALUE_NAIRA = 15_000;

interface EarningsRow {
  label: string;
  value: string;
  highlight: boolean;
}

function buildEarningsRows(commissionRate: number): EarningsRow[] {
  const sampleTotal = ILLUSTRATION_ORDERS * ILLUSTRATION_ORDER_VALUE_NAIRA;
  const agentEarns = Math.round((sampleTotal * commissionRate) / 100);
  const companyKeeps = sampleTotal - agentEarns;
  return [
    {
      label: "Sales closed",
      value: `${ILLUSTRATION_ORDERS} orders`,
      highlight: false,
    },
    {
      label: "Total sale amount",
      value: formatCurrency(sampleTotal),
      highlight: false,
    },
    {
      label: `Your commission (${commissionRate}%)`,
      value: formatCurrency(agentEarns),
      highlight: true,
    },
    {
      label: `Company keeps (${100 - commissionRate}%)`,
      value: formatCurrency(companyKeeps),
      highlight: false,
    },
  ];
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function AgentsPage() {
  const { isAuthenticated, dashboardPath } = useAuth();
  const [activeStep, setActiveStep] = useState<number>(0);
  /*
   * Shared context rather than a local fetch. This page used to default to a
   * hardcoded rate while its own request was in flight, so every visitor
   * briefly saw an earnings table computed at the wrong figure - on the page
   * whose whole purpose is telling agents what they will earn.
   */
  const { commissionPercent: commissionRate, isLoading: configLoading } =
    usePlatformConfig();

  /*
   * Never render a rate that is not the real one: a placeholder reads as a
   * commitment on a recruitment page. While loading, the figure is omitted
   * rather than guessed.
   */
  const rateLabel = configLoading ? "competitive" : `${commissionRate}%`;
  const earningsRows = buildEarningsRows(commissionRate);

  return (
    <>
      <Header
        navLinks={marketingNavLinks}
        signUpHref="/signup?role=agent"
        isAuthenticated={isAuthenticated}
        dashboardPath={dashboardPath}
      />

      {/* Hero */}
      <div className="relative flex w-full flex-col">
        <div className="-mt-navbar-h flex min-h-0 w-full flex-1">
          <div className="from-primary -mt-navbar-h via-primary to-primary absolute inset-0 z-0 overflow-hidden bg-linear-to-b" />
          <section className="font-syne relative mx-auto flex h-full min-h-screen w-full flex-col overflow-hidden">
            <HeroSection
              images={["/images/landing/hero-1.jpg"]}
              servingLocation="Now Hiring in Kaduna"
              headingParts={{
                top: [{ text: "Earn While You" }],
                bottom: [
                  { text: "Serve Your " },
                  { text: "Community", highlight: true },
                  { text: "." },
                ],
              }}
              subtext={`Become a Debridgers field agent. Source fresh foodstuff, manage deliveries, and earn ${rateLabel} commission on every sale — on your own schedule.`}
              secondaryCta={{ label: "Apply Now", href: "#apply-now" }}
              trustItems={[
                {
                  icon: "lucide:wallet",
                  label: `${rateLabel} commission per sale`,
                },
                { icon: "lucide:clock", label: "Flexible working hours" },
                {
                  icon: "lucide:graduation-cap",
                  label: "Free onboarding & training",
                },
                { icon: "lucide:map-pin", label: "Kaduna - local routes" },
              ]}
            />
          </section>
        </div>
      </div>

      {/* What You Do / Your Role */}
      <section className="w-full bg-white">
        <div className="default-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto">
          <div className="flex flex-col gap-8">
            {/* Role Title */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="flex flex-col gap-3"
            >
              <p className="text-primary-light text-xl tracking-widest">
                Your role
              </p>
              <h2 className="font-syne text-primary w-full max-w-182.5 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
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
                  className="border-line flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md"
                >
                  <span className="bg-light-bg flex h-12 w-12 items-center justify-center rounded-xl">
                    <Icon icon={card.icon} className="text-primary h-6 w-6" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-syne text-heading text-lg font-bold">
                      {card.title}
                    </h3>
                    <p className="font-open-sans text-body text-base leading-relaxed">
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
      <section id="benefits" className="bg-light-bg w-full">
        <div className="default-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto">
          <div className="flex flex-col gap-8">
            {/* Why Join Us Title */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="flex flex-col gap-3"
            >
              <p className="text-primary-light text-xl tracking-widest">
                Why join us
              </p>
              <h2 className="font-syne text-primary max-w-182.5 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
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
                  <span className="bg-dash-quick-action-hover mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon icon={b.icon} className="text-primary h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-syne text-heading text-base font-bold">
                      {b.title}
                    </h3>
                    <p className="font-open-sans text-body text-sm leading-relaxed">
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
      <section id="how-it-works" className="w-full bg-white">
        <div className="default-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto">
          <div className="flex flex-col gap-8">
            {/* Heading */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="flex flex-col gap-3"
            >
              <p className="text-primary-light text-xl tracking-widest">
                The process
              </p>
              <h2 className="font-syne text-primary max-w-182.5 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
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
                  className={`relative flex flex-col gap-4 rounded-2xl border-2 p-8 transition-all duration-300 ${
                    activeStep === i
                      ? "border-primary bg-dash-quick-action-hover"
                      : "border-line bg-white"
                  }`}
                >
                  <span
                    className={`font-syne text-5xl leading-none font-extrabold ${
                      activeStep === i ? "text-primary" : "text-line"
                    }`}
                  >
                    {step.number}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-syne text-heading text-xl font-bold">
                      {step.title}
                    </h3>
                    <p className="font-open-sans text-body text-base leading-relaxed">
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
      <section className="bg-primary w-full">
        <div className="default-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            {/* Heading */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="flex flex-col gap-3"
            >
              <p className="text-xl tracking-widest text-white/60">
                Example earnings
              </p>
              <h2 className="font-syne max-w-182.5 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                What a good week looks like.
              </h2>
              <p className="font-open-sans max-w-140 text-lg leading-relaxed text-white/80">
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
              {/*
                Skeleton until the real rate arrives. Rendering the table at a
                default would state a specific naira figure the agent would be
                right to hold us to.
              */}
              <div className="flex flex-col gap-4">
                {configLoading
                  ? [0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-3"
                      >
                        <span className="h-4 w-40 animate-pulse rounded bg-white/20" />
                        <span className="h-5 w-24 animate-pulse rounded bg-white/20" />
                      </div>
                    ))
                  : earningsRows.map((row, i) => (
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
                          className={`font-syne text-lg font-bold ${
                            row.highlight ? "text-secondary" : "text-white"
                          }`}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
              </div>
              <p className="mt-4 text-xs text-white/50">
                * Based on {formatCurrency(ILLUSTRATION_ORDER_VALUE_NAIRA)}{" "}
                average order value. Actual earnings vary.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section id="apply-now" className="w-full bg-white">
        <div className="default-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto">
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
            <h2 className="font-syne text-primary mx-auto max-w-182.5 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
              Apply in under 3 minutes.
            </h2>
            <p className="font-open-sans text-body mx-auto max-w-137.5 text-lg leading-relaxed">
              No experience required. Just bring your hustle - we&apos;ll handle
              the rest.
            </p>
            <Link
              to="/signup?role=agent"
              className="bg-primary font-syne inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
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
