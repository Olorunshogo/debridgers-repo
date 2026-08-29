import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import {
  AppLogo,
  PrimaryLink,
  SecondaryLink,
  WhatsAppLink,
  supportWhatsAppHref,
} from "@debridgers/ui-web";
import { X } from "lucide-react";

interface NavLinkItem {
  label: string;
  href: string;
}

interface HeaderProps {
  /* Readonly: the header renders this list and never mutates it, which lets
     callers pass a shared `as const` navigation table. */
  navLinks: readonly NavLinkItem[];
  orderNowHref?: string;
  signUpHref: string;
  heroSectionId?: string;
  isAuthenticated?: boolean;
  dashboardPath?: string;
  /*
   * What the header is sitting on.
   *
   * "hero" watches the dark hero behind it and inverts as you scroll past.
   * "solid" is for a page with no hero, where guessing from scroll position
   * produced a white pill on a white page that turned green 80% of a viewport
   * later. A page without a hero must say so rather than be inferred.
   */
  surface?: "hero" | "solid";
}

export function Header({
  navLinks,
  orderNowHref = supportWhatsAppHref(),
  signUpHref,
  heroSectionId,
  isAuthenticated = false,
  dashboardPath = "/buyer-dashboard",
  surface = "hero",
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [onGreenBg, setOnGreenBg] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    /* Nothing to track on a page with no hero: the colours are fixed. */
    if (surface === "solid") return;

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
  }, [heroSectionId, surface]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSolid = surface === "solid";

  /*
   * On a solid page the pill needs to read as a distinct surface. Pure white on
   * a white page is invisible, so it takes a faint tint and a border instead.
   */
  const pillBg = isSolid
    ? "rgba(250,251,250,1)"
    : onGreenBg
      ? "rgba(255,255,255,1)"
      : "rgba(30,89,37,0.95)";
  const pillBlur = isSolid
    ? "blur(0px)"
    : onGreenBg
      ? "blur(0px)"
      : "blur(14px)";
  const linkColor = onGreenBg ? "text-primary" : "text-white";
  const primaryLinkClass = onGreenBg
    ? "bg-primary text-white"
    : "bg-white text-primary";
  const secondaryLinkClass = onGreenBg
    ? "border-primary text-primary border bg-transparent"
    : "border-white text-white border bg-transparent";

  return (
    <motion.header
      className={`font-syne h-navbar-h mx-auto flex w-4/5 max-w-232 rounded-full p-4 xl:max-w-260 ${
        isSolid ? "border-line border shadow-sm" : "shadow-md"
      }`}
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
          {isAuthenticated ? (
            <SecondaryLink href={dashboardPath} className={secondaryLinkClass}>
              Dashboard
            </SecondaryLink>
          ) : (
            <SecondaryLink href={signUpHref} className={secondaryLinkClass}>
              Sign Up
            </SecondaryLink>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`cursor-pointer transition-colors duration-300 lg:hidden ${onGreenBg ? "text-gray-700" : "text-white"}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            // <Icon icon="lucide:x" width={24} height={24} />
            // <Icon icon="lucide:menu" width={24} height={24} />
            <div />
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
                  className="px-section-px fixed top-0 left-0 z-50 h-full w-full max-w-120 overflow-hidden bg-white shadow-xl lg:hidden"
                >
                  <div className="flex h-full w-full flex-col gap-6 py-6">
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

                    <WhatsAppLink
                      shadowYellow={false}
                      className="w-full text-center"
                    />

                    <div className="flex flex-col gap-3">
                      {isAuthenticated ? (
                        <PrimaryLink
                          href={dashboardPath}
                          className="w-full text-center"
                        >
                          Go to Dashboard
                        </PrimaryLink>
                      ) : (
                        <>
                          <PrimaryLink
                            href="/login"
                            className="w-full text-center"
                          >
                            Log In
                          </PrimaryLink>
                          <SecondaryLink
                            href={signUpHref}
                            className="w-full text-center"
                          >
                            Sign Up
                          </SecondaryLink>
                        </>
                      )}
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
