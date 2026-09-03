import type { Route } from "./+types/about";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "../../contexts/AuthContext";
import { HeroSection } from "../../components/marketing/HeroSection";
import { Telescope, Target, Package } from "lucide-react";

import {
  marketingNavLinks,
  VISION,
  MISSION,
} from "@/components/marketing/data/data";

// === Metadata
export function meta({}: Route.MetaArgs) {
  return [
    { title: "About Debridgers | Our Vision and Mission" },
    {
      name: "description",
      content:
        "Learn about Debridgers, a B2B food procurement and distribution company in Kaduna. See our vision and mission and how we connect buyers, agents and farmers.",
    },
    {
      name: "keywords",
      content:
        "about Debridgers, Debridgers vision, Debridgers mission, food procurement Kaduna, food distribution Nigeria, Debridgers company",
    },

    // === Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://debridgers.com/about" },
    { property: "og:site_name", content: "Debridgers" },
    {
      property: "og:title",
      content: "About Debridgers | Our Vision and Mission",
    },
    {
      property: "og:description",
      content:
        "Learn about Debridgers, a B2B food procurement and distribution company in Kaduna, and the vision and mission that drive it.",
    },
    { property: "og:image", content: "https://debridgers.com/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Debridgers, fresh foodstuff at market prices in Kaduna",
    },
    { property: "og:locale", content: "en_NG" },

    // === Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@debridgers" },
    { name: "twitter:url", content: "https://debridgers.com/about" },
    {
      name: "twitter:title",
      content: "About Debridgers | Our Vision and Mission",
    },
    {
      name: "twitter:description",
      content:
        "Learn about Debridgers, a B2B food procurement and distribution company in Kaduna, and the vision and mission that drive it.",
    },
    { name: "twitter:image", content: "https://debridgers.com/og-image.png" },
    {
      name: "twitter:image:alt",
      content: "Debridgers, fresh foodstuff at market prices in Kaduna",
    },

    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "index, follow" },
  ];
}

// === Main Page
export default function AboutPage() {
  const { isAuthenticated, dashboardPath } = useAuth();

  return (
    <>
      <Header
        navLinks={marketingNavLinks}
        signUpHref="/signup"
        isAuthenticated={isAuthenticated}
        dashboardPath={dashboardPath}
      />

      {/* Hero Section */}
      <div className="relative flex w-full flex-col">
        <div className="-mt-navbar-h flex min-h-0 w-full flex-1">
          <div className="from-primary -mt-navbar-h via-primary to-primary absolute inset-0 z-0 overflow-hidden bg-linear-to-b" />
          <section className="font-syne relative mx-auto flex h-full min-h-screen w-full flex-col overflow-hidden">
            <HeroSection
              images={["/images/landing/hero-1.jpg"]}
              servingLocation="Now Serving in Kaduna"
              headingParts={{
                top: [{ text: "About" }],
                bottom: [
                  { text: "De" },
                  { text: "bridgers", highlight: true },
                  { text: "." },
                ],
              }}
              subtext="B2B food procurement and distribution built on a clear vision and mission."
              secondaryCta={{ label: "Contact Us", href: "/contact" }}
              trustItems={[
                { icon: "lucide:map-pin", label: "Kaduna, Nigeria" },
                {
                  icon: "lucide:shield-check",
                  label: "Market prices, no markups",
                },
                { icon: "lucide:truck", label: "Delivery to home or shop" },
              ]}
            />
          </section>
        </div>
      </div>

      <section className="font-openSans h-full w-full bg-white">
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg py-section-py sm:py-section-py-sm lg:py-section-py-lg section-max-width mx-auto flex flex-col gap-10">
          {/* Vision and Mission */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border-primary flex h-full flex-col gap-5 rounded-2xl border bg-white p-6 lg:p-8">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#A7E8BF]">
                <Telescope className="text-primary h-7 w-7" />
              </span>
              <h2 className="font-open-sans text-2xl font-semibold text-black">
                Our Vision
              </h2>
              <p className="text-body text-lg leading-relaxed lg:text-xl">
                {VISION}
              </p>
            </div>

            <div className="border-primary flex h-full flex-col gap-5 rounded-2xl border bg-white p-6 lg:p-8">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#A7E8BF]">
                <Target className="text-primary h-7 w-7" />
              </span>
              <h2 className="font-open-sans text-2xl font-semibold text-black">
                Our Mission
              </h2>
              <p className="text-body text-lg leading-relaxed lg:text-xl">
                {MISSION}
              </p>
            </div>
          </div>

          {/* What Debridgers Does */}
          <div className="border-line flex flex-col gap-4 rounded-2xl border p-6 lg:p-8">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#A7E8BF]">
              <Package className="text-primary h-7 w-7" />
            </span>
            <h2 className="font-open-sans text-2xl font-semibold text-black">
              What We Do
            </h2>
            <p className="text-body text-base leading-relaxed lg:text-lg">
              Debridgers runs B2B food procurement and distribution in Kaduna.
              Buyers order packages of grain, beans and oil, agents sell in the
              field, and admins run fulfilment, connecting the full chain from
              sourcing to delivery.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
