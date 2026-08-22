import { useState } from "react";
import { Link } from "react-router";
import {
  SUPPORT,
  partnerMailtoHref,
  supportMailtoHref,
  supportTelHref,
  supportWhatsAppHref,
} from "@debridgers/ui-web";

// === Footer Woodmark component
type FooterWordmarkProps = {
  position?: "top" | "bottom";
  className?: string;
};

function FooterWordmark({
  position = "top",
  className = "",
}: FooterWordmarkProps) {
  const isTop = position === "top";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 flex justify-center overflow-hidden select-none ${
        isTop ? "top-0" : "bottom-0 items-end"
      } ${className}`}
    >
      <span
        className="font-syne text-[50px] leading-none font-extrabold tracking-normal whitespace-nowrap sm:text-[80px] lg:text-[140px]"
        style={{
          background: isTop
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(16, 17, 16, 0.01) 60%)"
            : "linear-gradient(180deg, rgba(16, 17, 16, 0.01) 48.38%, rgba(255, 255, 255, 0.2) 69.91%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Debridgers
      </span>
    </div>
  );
}

export default function Footer() {
  const [email, setEmail] = useState<string>("");

  return (
    <footer className="bg-primary py-section-py sm:py-section-py-sm lg:py-section-py-lg relative overflow-hidden text-white">
      <FooterWordmark position="top" />

      <FooterWordmark position="bottom" />

      {/* Main footer content */}
      <div className="section-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg relative z-10 mx-auto flex flex-col gap-8">
        {/* Top section: tagline + columns */}
        {/*
          Three explicit tracks, side by side from lg.

          minmax(0,…) on each: the email addresses are long unbreakable strings,
          and a bare fr floors at min-content, so the middle track would push the
          headline narrower than its share until it wrapped.
        */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
          {/* Tagline */}
          <h1 className="font-syne flex flex-col text-4xl leading-tight font-medium text-white sm:text-5xl lg:text-6xl">
            <span>Market Prices.</span>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <div className="relative inline-block">
                <span>Zero</span>
                <img
                  src="/images/landing/curved-underline.png"
                  className="absolute -mt-2 w-fit"
                />
              </div>
              <div className="relative inline-block">
                <span className="text-secondary">Market</span>
              </div>
              <span>Stress.</span>
            </div>
          </h1>

          {/* Support and Need help */}
          <div className="grid grid-cols-2 items-start gap-8">
            {/* Support */}
            <div className="font-open-sans flex flex-col gap-8">
              <h2 className="font-open-sans text-sm font-semibold tracking-widest text-white uppercase">
                Support
              </h2>
              <nav className="flex flex-col gap-3 text-sm">
                {[
                  { label: "Home", to: "/" },
                  { label: "Agents", to: "/agents" },
                  { label: "Contact Us", to: "/contact" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="font-open-sans w-fit cursor-pointer text-base text-white transition-all duration-300 ease-in-out hover:text-white/80"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Need Help */}
            <div className="font-open-sans flex flex-col gap-8 lg:gap-11">
              <h3 className="font-open-sans text-sm font-semibold tracking-widest text-white uppercase">
                Need Help?
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 text-sm text-white">
                  <p className="text-sm tracking-widest text-white uppercase">
                    Call us directly
                  </p>
                  <a
                    href={supportTelHref}
                    className="text-white/90 transition-colors duration-200 hover:text-white"
                  >
                    {SUPPORT.phoneDisplay}
                  </a>
                  <p className="text-xs text-white/70">{SUPPORT.hours}</p>
                </div>
                <div className="font-open-sans flex flex-col gap-1 text-white">
                  <h3 className="text-sm tracking-widest text-white uppercase">
                    Email us at
                  </h3>
                  <a
                    href={supportMailtoHref}
                    className="text-sm text-white underline decoration-white decoration-1 underline-offset-4 transition-colors duration-300 ease-in-out hover:text-white"
                  >
                    {SUPPORT.supportEmail}
                  </a>
                  <a
                    href={partnerMailtoHref}
                    className="text-sm text-white underline decoration-white decoration-1 underline-offset-4 transition-colors duration-300 ease-in-out hover:text-white"
                  >
                    {SUPPORT.partnerEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Keep in Touch - always full width */}
          <div className="font-open-sans flex w-full flex-col gap-5">
            <h3 className="font-open-sans text-sm font-semibold tracking-widest text-white uppercase">
              Keep in Touch
            </h3>
            <div className="flex w-full overflow-hidden rounded-full bg-white p-3 shadow-[0px_4px_32px_5px_#FAF2F23B]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="text-primary placeholder:text-primary min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
              />
              <button
                type="button"
                className="bg-primary cursor-pointer rounded-full px-8 py-2.5 text-sm text-white transition-opacity duration-300 hover:opacity-90"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="font-open-sans relative z-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-sm text-white md:flex-row">
          <p className="mx-auto text-sm text-white md:mx-0">
            &copy; 2026 Debridgers. Delivering fresh to Kaduna.
          </p>
          <div className="hidden items-center gap-6 md:flex">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Contact", to: "/contact" },
              {
                label: "WhatsApp",
                to: supportWhatsAppHref(),
              },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-white transition-all duration-300 ease-in-out hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
