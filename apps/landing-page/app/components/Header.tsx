import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { PrimaryLink, SecondaryLink, WhatsAppButton } from "@debridgers/ui-web";

interface HeaderProps {
  navLinks: Array<{ label: string; href: string }>;
  orderNowHref?: string;
  signUpHref: string;
}

export function Header({
  navLinks,
  orderNowHref = "https://wa.me/+2347012288798",
  signUpHref,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 right-0 left-0 z-50">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between rounded-full bg-white px-4 py-2 shadow-sm">
          {/* Logo */}
          <span className="font-bold" style={{ color: "var(--color-primary)" }}>
            Debridger
          </span>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-primary text-sm text-gray-700 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA buttons */}
          <div className="hidden gap-2 md:flex">
            <PrimaryLink href={orderNowHref}>Order Now</PrimaryLink>
            <SecondaryLink href={signUpHref}>Sign Up</SecondaryLink>
          </div>

          {/* Mobile hamburger */}
          <button
            className="text-gray-700 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full right-0 left-0 flex flex-col gap-4 rounded-b-2xl bg-white px-6 py-4 shadow-lg md:hidden"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="hover:text-primary text-sm text-gray-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <WhatsAppButton className="w-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
