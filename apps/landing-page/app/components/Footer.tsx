import { useState } from "react";
import { Link } from "react-router";
import { Phone, Mail } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer
      className="relative overflow-hidden text-white"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      <div className="px-section sm:px-section-px-sm lg:px-section-px-lg py-section-py-sm mx-auto w-full max-w-7xl">
        <div className="gap-4xl lg:gap-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <h2 className="text-4xl leading-tight font-bold lg:col-span-2">
            Market Prices.
            <br />
            Zero <span style={{ color: "var(--color-secondary)" }}>
              Market
            </span>{" "}
            Stress.
          </h2>

          {/* Support */}
          <div className="flex flex-col gap-(--gap-lg) lg:col-span-1">
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--color-secondary)" }}
            >
              Support
            </p>
            <nav className="flex flex-col gap-(--gap-base) text-sm">
              {[
                { label: "Home", to: "/" },
                { label: "About Us", to: "/about" },
                { label: "Contact Us", to: "/contact" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="cursor-pointer text-green-200 transition-all duration-300 ease-in-out hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Need Help */}
          <div className="flex flex-col gap-(--gap-lg) lg:col-span-1">
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--color-secondary)" }}
            >
              Need Help?
            </p>
            <div className="flex flex-col gap-(--gap-base) text-sm">
              <p className="text-xs font-medium tracking-wider text-green-400 uppercase">
                Call us directly
              </p>
              <a
                href="tel:+2348167042797"
                className="gap-sm flex cursor-pointer items-center text-green-200 transition-all duration-300 ease-in-out hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0" />
                +234 816 704 2797
              </a>
              <p className="text-xs font-medium tracking-wider text-green-400 uppercase">
                Email us at
              </p>
              <a
                href="mailto:support@debridger.com"
                className="gap-sm flex cursor-pointer items-center text-green-200 transition-all duration-300 ease-in-out hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" />
                support@debridger.com
              </a>
              <a
                href="mailto:partner@debridger.com"
                className="gap-sm flex cursor-pointer items-center text-green-200 transition-all duration-300 ease-in-out hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" />
                partner@debridger.com
              </a>
            </div>
          </div>

          {/* Keep in Touch */}
          <div className="flex flex-col gap-(--gap-lg) lg:col-span-2">
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--color-secondary)" }}
            >
              Keep in Touch
            </p>
            <div className="flex overflow-hidden rounded-full border border-white/20 bg-white/10">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
              <button
                type="button"
                className="cursor-pointer rounded-full px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:opacity-90"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 py-6">
        <div className="gap-base px-section sm:px-section-px-sm lg:px-section-px-lg mx-auto flex max-w-7xl flex-col items-center justify-between text-xs text-green-300 md:flex-row">
          <p>© 2026 Debridger. Delivering fresh to Kaduna South.</p>
          <div className="gap-xl flex">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Contact", to: "/contact" },
              { label: "WhatsApp", to: "https://wa.me/2347012288798" },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="cursor-pointer transition-all duration-300 ease-in-out hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Large faded background wordmark */}
      <div className="pointer-events-none absolute right-8 bottom-0 hidden text-[140px] leading-none font-extrabold tracking-tighter text-white/5 select-none xl:block">
        debridger
      </div>
    </footer>
  );
}
