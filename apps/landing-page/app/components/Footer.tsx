import { useState } from "react";
import { Link } from "react-router";

export default function Footer() {
  const [email, setEmail] = useState<string>("");

  return (
    <footer className="bg-primary relative overflow-hidden text-white">
      {/* Background "Debridger" wordmark — top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden select-none"
      >
        <span
          className="font-syne text-[50px] leading-none font-extrabold tracking-normal whitespace-nowrap sm:text-[90px] lg:text-[160px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(16, 17, 16, 0.01) 60%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Debridger
        </span>
      </div>

      {/* Background "Debridger" wordmark — bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center overflow-hidden select-none"
      >
        <span
          className="font-syne text-[50px] leading-none font-extrabold tracking-normal whitespace-nowrap sm:text-[90px] lg:text-[160px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(16, 17, 16, 0.01) 48.38%, rgba(255, 255, 255, 0.2) 69.91%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Debridger
        </span>
      </div>

      {/* Main footer content */}
      <div className="gap-2xl px-section-px lg:gap-2xl sm:px-section-px-sm lg:px-section-px-lg default-max-width relative z-10 mx-auto flex w-full flex-col">
        {/* Top section: tagline + columns */}
        <div className="py-section-py lg:py-section-py-lg sm:py-section-py-sm grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1fr] lg:items-center">
          {/* Tagline */}
          <h1 className="font-syne flex flex-col text-4xl leading-tight font-medium text-white">
            <span>Market Prices.</span>
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span>Zero </span>
              <div className="relative inline-block">
                <span style={{ color: "var(--secondary-color)" }}>Market</span>
              </div>
              <div className="relative inline-block">
                <span>Stress.</span>
                <img
                  src="/images/curved-underline.png"
                  className="absolute w-fit"
                />
              </div>
            </span>
          </h1>

          {/* Support and Need help */}
          <div className="gap-2xl grid grid-cols-2 items-center">
            {/* Support */}
            <div className="gap-2xl font-open-sans flex flex-col">
              <h2 className="font-open-sans text-[14px] font-semibold tracking-widest text-white uppercase">
                Support
              </h2>
              <nav className="gap-md flex flex-col text-sm">
                {[
                  { label: "Home", to: "/" },
                  // { label: "Agents", to: "/agents" },
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
            <div className="gap-2xl font-open-sans flex flex-col lg:gap-[44px]">
              <h3 className="font-open-sans text-[14px] font-semibold tracking-widest text-white uppercase">
                Need Help?
              </h3>

              <div className="gap-md flex flex-col">
                {/* Phone Number */}
                <div className="flex flex-col gap-1 text-sm text-white">
                  <p className="text-sm tracking-widest text-white uppercase">
                    Call us directly
                  </p>
                  <a
                    href="tel:+2348167042797"
                    className="text-white/90 transition-colors duration-200 hover:text-white"
                  >
                    +2348167042797
                  </a>
                </div>

                {/* Emails */}
                <div className="font-open-sans flex flex-col gap-1 text-white">
                  <h3 className="text-sm tracking-widest text-white uppercase">
                    Email us at
                  </h3>
                  <a
                    href="mailto:support@debridger.com"
                    className="text-[14px] text-white underline decoration-white decoration-1 underline-offset-4 transition-colors duration-300 ease-in-out hover:text-white"
                  >
                    support@debridger.com
                  </a>
                  <a
                    href="mailto:partner@debridger.com"
                    className="text-[14px] text-white underline decoration-white decoration-1 underline-offset-4 transition-colors duration-300 ease-in-out hover:text-white"
                  >
                    partner@debridger.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Keep in Touch */}
          <div className="font-open-sans flex flex-col gap-5">
            <h3 className="font-open-sans text-[14px] font-semibold tracking-widest text-white uppercase">
              Keep in Touch
            </h3>
            <div className="p-md flex w-full overflow-hidden rounded-full bg-white shadow-[0px_4px_32px_5px_#FAF2F23B]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="text-primary placeholder:text-primary min-w-0 flex-1 bg-transparent text-[14px] focus:outline-none"
              />
              <button
                type="button"
                className="px-2xl bg-primary cursor-pointer rounded-full py-2.5 text-[14px] text-white transition-opacity duration-300 hover:opacity-90"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="font-open-sans relative z-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-sm text-white md:flex-row">
          <p className="font-open-sans mx-auto text-sm text-white md:mx-0">
            &copy; 2026 Debridger. Delivering fresh to Kaduna.
          </p>
          <div className="hidden items-center gap-6 md:flex">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Contact", to: "/contact" },
              { label: "WhatsApp", to: "https://wa.me/2347012288798" },
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
