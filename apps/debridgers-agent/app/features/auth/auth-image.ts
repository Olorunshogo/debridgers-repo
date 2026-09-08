import type { AuthImageSlide } from "@debridgers/ui-web";

/* Single slide - this app only ever serves agents.
See debridgers-marketing's auth-images.ts for the multi-role carousel that reuses this same image. */
export const AUTH_IMAGES: readonly AuthImageSlide[] = [
  {
    src: "/images/signup-agent.jpg",
    alt: "Fresh produce ready for delivery across Kaduna",
    title: "Build your own route",
    subtitle: "Sell in the field and earn commission with every delivery.",
  },
];
