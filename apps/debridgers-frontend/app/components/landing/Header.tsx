import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import {
  AppLogo,
  PrimaryLink,
  SecondaryLink,
  WhatsAppButton,
} from "@debridgers/ui-web";
import { X } from "lucide-react";

interface NavLinkItem {
  label: string;
  href: string;
}

interface HeaderProps {
  navLinks: NavLinkItem[];
  orderNowHref?: string;
  signUpHref: string;
  heroSectionId?: string;
}

export function Header({
  navLinks,
  orderNowHref = "https://wa.me/+2347012288798",
  signUpHref,
  heroSectionId,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [onGreenBg, setOnGreenBg] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const updateBg = () => {
      if (heroSectionId) {
        const hero = document.getElementById(heroSectionId);
        if (!hero) return;
        const rect = hero.getBoundingClientRect();
        // Hero is "behind" the header when its bottom edge is still below the header height
        setOnGreenBg(rect.bottom > 80);
      } else {
        setOnGreenBg(window.scrollY < window.innerHeight * 0.8);
      }
    };

    updateBg();
    window.addEventListener("scroll", updateBg, { passive: true });
    window.addEventListener("resize", updateBg, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateBg);
      window.removeEventListener("resize", updateBg);
    };
  }, [heroSectionId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pillBg = onGreenBg ? "rgba(255,255,255,1)" : "rgba(30,89,37,0.95)";
  const pillBlur = onGreenBg ? "blur(0px)" : "blur(14px)";
  const linkColor = onGreenBg ? "text-primary" : "text-white";
  const primaryLinkClass = onGreenBg
    ? "bg-primary text-white"
    : "bg-white text-primary";
  const secondaryLinkClass = onGreenBg
    ? "border-primary text-primary border bg-transparent"
    : "border-white text-white border bg-transparent";

  return (
    <motion.header
      className="font-syne h-navbar-h mx-auto flex w-9/10 max-w-232 rounded-full p-4 shadow-md"
      animate={{ backgroundColor: pillBg, backdropFilter: pillBlur }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <div className="flex w-full items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <AppLogo variant={onGreenBg ? "black" : "white"} />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-2 lg:flex">
          {navLinks.map((link) => {
            const isHash = link.href.startsWith("#");
            if (isHash) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`font-open-sans p-2.5 text-sm font-semibold transition-colors duration-300 ease-in-out hover:opacity-70 ${linkColor}`}
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
                  `font-open-sans p-2.5 text-sm font-semibold transition-colors duration-300 ease-in-out ${
                    isActive
                      ? `${linkColor} underline decoration-2 underline-offset-4`
                      : `${linkColor} hover:opacity-70`
                  }`
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop CTA buttons */}
        <div className="hidden gap-2 lg:flex">
          <PrimaryLink href={orderNowHref} className={primaryLinkClass}>
            Order Now
          </PrimaryLink>
          <SecondaryLink href={signUpHref} className={secondaryLinkClass}>
            Sign Up
          </SecondaryLink>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`cursor-pointer transition-colors duration-300 lg:hidden ${onGreenBg ? "text-gray-700" : "text-white"}`}
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

      {/* Mobile Menu -> portalled to document.body so fixed positioning works correctly */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.div
                  className="fixed inset-0 z-40 h-full cursor-pointer bg-black/60 lg:hidden"
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
                  className="px-section-px fixed top-0 left-0 z-50 h-full w-[85%] max-w-95 overflow-hidden bg-white shadow-xl lg:hidden"
                >
                  <div className="flex h-full w-full flex-col gap-4 py-6">
                    <div className="flex w-full items-center justify-between">
                      <Link
                        to="/"
                        className="text-primary font-syne flex-1 text-xl font-semibold"
                      >
                        Debridgers
                      </Link>

                      <X size={16} strokeWidth={2} className="cursor-pointer" />
                    </div>
                    <div className="flex flex-col gap-7 py-4">
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
                    <WhatsAppButton className="w-full" />
                    <div className="flex flex-col gap-3">
                      <PrimaryLink href="/login" className="w-full text-center">
                        Log In
                      </PrimaryLink>
                      <SecondaryLink
                        href={signUpHref}
                        className="w-full text-center"
                      >
                        Sign Up
                      </SecondaryLink>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.header>
  );
}
