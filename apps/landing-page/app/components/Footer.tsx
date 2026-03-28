import { useState } from "react";
import { Link } from "react-router";

export default function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-primary relative overflow-hidden text-white">
      {/* Background "Debridger" wordmark — top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden select-none"
      >
        <span
          className="font-syne text-[50px] leading-none font-extrabold tracking-normal whitespace-nowrap lg:text-[180px]"
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
          className="font-syne text-[50px] leading-none font-extrabold tracking-normal whitespace-nowrap lg:text-[180px]"
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
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 pt-[60px] pb-0 sm:px-10 lg:px-[100px] lg:pt-[100px]">
        {/* Top section: tagline + columns */}
        <div className="flex flex-col gap-10 lg:gap-[87px]">
          {/* Tagline */}
          <h2 className="font-syne medium text-[28px] leading-tight sm:text-[36px] lg:text-[42px]">
            Market Prize
            <br />
            Zero <span style={{ color: "var(--secondary-color)" }}>
              Market
            </span>{" "}
            Stress
            {/* <span className="bg-secondary mt-2 block h-[3px] w-16 rounded-full sm:w-20" /> */}
          </h2>

          {/* Columns grid */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
            {/* Support */}
            <div className="gap-base flex flex-col">
              <h2 className="font-open-sans text-[14px] font-semibold tracking-widest text-white uppercase">
                Support
              </h2>
              <nav className="gap-md flex flex-col text-sm">
                {[
                  { label: "Home", to: "/" },
                  // { label: "About Us", to: "/about" },
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
            <div className="gap-base flex flex-col">
              <h3 className="font-open-sans text-[14px] tracking-widest text-white uppercase">
                Need Help?
              </h3>

              {/* Phone Number */}
              <div className="gap-md flex flex-col text-sm text-white">
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
              <div className="gap-md font-open-sans flex flex-col text-white">
                <h3 className="mt-md text-sm tracking-widest text-white uppercase">
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

            {/* Keep in Touch */}
            <div className="flex flex-col gap-5 sm:col-span-2 lg:col-span-1">
              <h3 className="font-open-sans text-[14px] font-semibold tracking-widest text-white uppercase">
                Keep in Touch
              </h3>
              <div className="flex w-full overflow-hidden rounded-full bg-white p-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="p-md text-primary placeholder:text-primary min-w-0 flex-1 bg-transparent text-[14px] focus:outline-none"
                />
                <button
                  type="button"
                  className="px-2xl cursor-pointer rounded-full py-2.5 text-[14px] text-white transition-opacity duration-300 hover:opacity-90"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row">
          <p className="font-open-sans mx-auto text-sm text-white md:mx-0">
            &copy; 2026 Debridger. Delivering fresh to Kaduna South.
          </p>
          <div className="flex gap-6 md:hidden">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Contact", to: "/contact" },
              { label: "WhatsApp", to: "https://wa.me/2347012288798" },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="transition-colors duration-200 hover:text-white"
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
