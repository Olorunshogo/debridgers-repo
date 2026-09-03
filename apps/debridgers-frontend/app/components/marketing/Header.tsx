import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppLogo,
  PrimaryLink,
  SecondaryLink,
  WhatsAppLink,
  supportWhatsAppHref,
} from "@debridgers/ui-web";
import { Menu, ShoppingCart, X } from "lucide-react";

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
  /*
   * A cart affordance, for a page that has one.
   *
   * The shop's cart bar sits in the flow beneath a catalogue that grows with
   * the product count, so forty products down there was nothing to click. Both
   * props are needed together: a count with no handler is decoration.
   */
  cartCount?: number;
  onCartClick?: () => void;
}

// === Focus management

/** Every element inside the drawer that can hold focus, in document order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Header({
  navLinks,
  orderNowHref = supportWhatsAppHref(),
  signUpHref,
  heroSectionId,
  isAuthenticated = false,
  dashboardPath = "/buyer-dashboard",
  surface = "hero",
  cartCount,
  onCartClick,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  /* True while the hero is still behind the header. Meaningless when solid. */
  const [overHero, setOverHero] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const isSolid: boolean = surface === "solid";

  /*
   * Whether the pill is dark and therefore needs light content on it.
   *
   * Derived from the surface rather than from scroll state alone. The previous
   * version read a scroll flag that a solid page never updated, so solid pages
   * rendered correctly only because that flag happened to start true. Changing
   * an initial value would have inverted every one of them.
   */
  const isDark: boolean = !isSolid && !overHero;

  useEffect(() => {
    /* Nothing to track on a page with no hero: the colours are fixed. */
    if (isSolid) return;

    const updateBg = (): void => {
      if (heroSectionId) {
        const hero = document.getElementById(heroSectionId);
        if (!hero) return;
        const rect = hero.getBoundingClientRect();
        /* Hero is behind the header while its bottom edge is below the pill. */
        setOverHero(rect.bottom > 80);
      } else {
        setOverHero(window.scrollY < window.innerHeight * 0.8);
      }
    };

    updateBg();
    window.addEventListener("scroll", updateBg, { passive: true });
    window.addEventListener("resize", updateBg, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateBg);
      window.removeEventListener("resize", updateBg);
    };
  }, [heroSectionId, isSolid]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback((): void => {
    setMenuOpen(false);
    /* Focus goes back to what opened the drawer, not to the top of the page. */
    toggleRef.current?.focus();
  }, []);

  /*
   * While the drawer is open: the page behind it must not scroll, Escape must
   * close it, and Tab must not walk out of it into content nobody can see.
   * None of this existed, which made the menu unusable by keyboard and left
   * the page scrolling underneath on touch.
   */
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow: string = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, closeMenu]);

  /* Move focus into the drawer once it exists, so the first Tab lands inside. */
  useEffect(() => {
    if (!menuOpen) return;
    const timer = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  /*
   * On a solid page the pill needs to read as a distinct surface. Pure white on
   * a white page is invisible, so it takes a faint tint and a border instead.
   */
  const pillBg: string = isSolid
    ? "rgba(250,251,250,1)"
    : isDark
      ? "rgba(30,89,37,0.95)"
      : "rgba(255,255,255,1)";
  const pillBlur: string = isDark ? "blur(14px)" : "blur(0px)";
  const linkColor: string = isDark ? "text-white" : "text-primary";
  const primaryLinkClass: string = isDark
    ? "bg-white text-primary"
    : "bg-primary text-white";
  const secondaryLinkClass: string = isDark
    ? "border-white text-white border bg-transparent"
    : "border-primary text-primary border bg-transparent";

  const showCart: boolean = typeof cartCount === "number" && !!onCartClick;

  return (
    /*
     * The header positions itself.
     *
     * Every caller used to wrap it, and the five wrappers disagreed: four made
     * it sticky and the shop did not, so it scrolled away over a catalogue that
     * grows with the product count. The shop's wrapper also set a z-index on a
     * statically positioned element, which creates no stacking context at all,
     * so the cart backdrop painted straight over it.
     *
     * Owning both here means no page can get it wrong again.
     */
    <div className="sticky top-3 z-50">
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
            <AppLogo variant={isDark ? "white" : "black"} />
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
          <div className="hidden items-center gap-2 lg:flex">
            {showCart && (
              <CartButton
                count={cartCount as number}
                isDark={isDark}
                onClick={onCartClick as () => void}
              />
            )}
            <PrimaryLink href={orderNowHref} className={primaryLinkClass}>
              Order Now
            </PrimaryLink>
            {isAuthenticated ? (
              <SecondaryLink
                href={dashboardPath}
                className={secondaryLinkClass}
              >
                Dashboard
              </SecondaryLink>
            ) : (
              <SecondaryLink href={signUpHref} className={secondaryLinkClass}>
                Sign Up
              </SecondaryLink>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 lg:hidden">
            {showCart && (
              <CartButton
                count={cartCount as number}
                isDark={isDark}
                onClick={onCartClick as () => void}
              />
            )}
            <button
              ref={toggleRef}
              type="button"
              className={`cursor-pointer p-1 transition-colors duration-300 ${
                isDark ? "text-white" : "text-gray-700"
              }`}
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-menu"
            >
              {/* Both states render an icon. This used to render an empty div
                  when open, so the control vanished the moment it was used. */}
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu -> portalled to document.body so fixed positioning works */}
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
                  onClick={closeMenu}
                />
                <motion.div
                  ref={drawerRef}
                  id="marketing-mobile-menu"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Site menu"
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
                        onClick={closeMenu}
                        className="text-primary font-syne flex-1 text-xl font-semibold"
                      >
                        Debridgers
                      </Link>

                      {/* Wired. This was a bare icon with no handler, so the
                          only way out of the drawer was the backdrop. */}
                      <button
                        type="button"
                        onClick={closeMenu}
                        aria-label="Close menu"
                        className="text-heading cursor-pointer rounded-full p-2 hover:bg-black/5"
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
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
                              onClick={closeMenu}
                            >
                              {link.label}
                            </a>
                          );
                        }
                        return (
                          <NavLink
                            key={link.href}
                            to={link.href}
                            onClick={closeMenu}
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
    </div>
  );
}

// === Cart

function CartButton({
  count,
  isDark,
  onClick,
}: {
  count: number;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative cursor-pointer rounded-full p-2.5 transition-colors duration-300 ${
        isDark
          ? "text-white hover:bg-white/10"
          : "text-primary hover:bg-black/5"
      }`}
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
            isDark ? "text-primary bg-white" : "bg-primary text-white"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
