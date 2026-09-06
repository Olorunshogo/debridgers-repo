import type { AuthImageSlide } from "@debridgers/ui-web";

/* Single slide - this app only ever serves buyers, so there is no role to
   rotate through. See debridgers-marketing's auth-images.ts for the
   multi-role carousel that reuses this same image. */
export const AUTH_IMAGES: readonly AuthImageSlide[] = [
  {
    src: "/images/signup-buyer.jpg",
    alt: "A vendor arranging fresh produce at Kaduna's Central Market",
    title: "Fresh food, fair prices",
    subtitle:
      "Order groceries and food staples at market prices, delivered to your door.",
  },
];
