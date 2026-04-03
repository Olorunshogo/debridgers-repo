import { useState } from "react";
import { Link, NavLink } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import {
  AppLogo,
  PrimaryLink,
  SecondaryLink,
  WhatsAppButton,
} from "@debridgers/ui-web";

interface NavLinkItem {
  label: string;
  href: string;
}

interface HeaderProps {
  navLinks: NavLinkItem[];
  orderNowHref?: string;
  signUpHref: string;
}

export function Header({
  navLinks,
  orderNowHref = "https://wa.me/+2348167042797",
  signUpHref,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="p-base font-syne background-blur-sm h-navbar-h mx-auto flex w-9/10 max-w-[928px] rounded-full bg-white shadow-md">
      <div className="flex w-full items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <AppLogo />
        </Link>

        {/* Desktop nav links */}
        <nav className="gap-sm hidden items-center lg:flex">
          {navLinks.map((link) => {
            const isHash = link.href.startsWith("#");
            if (isHash) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-open-sans text-primary p-[10px] text-sm font-semibold transition-all duration-300 ease-in-out hover:opacity-70"
                >
                  {link.label}
                </a>
              );
            }
            return (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  `font-open-sans p-[10px] text-sm font-semibold transition-all duration-300 ease-in-out ${
                    isActive
                      ? "text-primary underline decoration-2 underline-offset-4"
                      : "text-primary hover:opacity-70"
                  }`
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop CTA buttons */}
        <div className="gap-sm hidden lg:flex">
          <PrimaryLink href={orderNowHref}>Order Now</PrimaryLink>
          <SecondaryLink href={signUpHref}>Sign Up</SecondaryLink>
        </div>

        {/* Mobile hamburger */}
        <button
          className="cursor-pointer text-gray-700 lg:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <Icon icon="lucide:x" width={24} height={24} />
          ) : (
            <Icon icon="lucide:menu" width={24} height={24} />
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 cursor-pointer bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="px-section-px fixed top-0 left-0 z-50 h-full w-full bg-white shadow-xl sm:w-1/2 lg:hidden"
            >
              <div className="gap-base py-xl flex w-full flex-col">
                <Link
                  to="/"
                  className="text-primary font-syne text-xl font-semibold"
                >
                  Debridger
                </Link>
                <div className="gap-2xl py-base flex flex-col">
                  {navLinks.map((link) => {
                    const isHash = link.href.startsWith("#");
                    if (isHash) {
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          className="text-primary font-syne text-base font-semibold transition-all duration-300 ease-in-out hover:opacity-70"
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </a>
                      );
                    }
                    return (
                      <NavLink
                        key={link.href}
                        to={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `font-syne text-base font-semibold transition-all duration-300 ease-in-out ${
                            isActive
                              ? "text-primary opacity-100"
                              : "text-primary hover:opacity-70"
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    );
                  })}
                </div>

                <WhatsAppButton className="mt-auto w-full" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
