import type { AuthImageSlide } from "@debridgers/ui-web";

/*
 * Marketing has no single role of its own, so its login/signup pickers rotate through every role it advertises (see public-roles.ts).
 * Same images and copy each role app uses on its own auth pages (debridgers-buyer/agent's features/auth/auth-image.ts), kept here rather than imported cross-app since these are separate deployable apps.
 */
export const AUTH_IMAGES: readonly AuthImageSlide[] = [
  {
    src: "/images/landing/market-lady.jpg",
    alt: "A vendor arranging fresh produce at Kaduna's Central Market",
    title: "Fresh food, fair prices",
    subtitle:
      "Order groceries and food staples at market prices, delivered to your door.",
  },
  {
    src: "/images/landing/hero-1.jpg",
    alt: "Fresh produce ready for delivery across Kaduna",
    title: "Build your own route",
    subtitle: "Sell in the field and earn commission with every delivery.",
  },
];
