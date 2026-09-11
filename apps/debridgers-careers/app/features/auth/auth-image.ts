import type { AuthImageSlide } from "@debridgers/ui-web";

/*
 * Single slide, plainer copy than buyer/agent on purpose - admin is invite-only, not a growth surface, so this panel doesn't need to sell anything.
 * Placeholder image (business-owner.jpg, renamed) until a real one replaces it - see signup-admin.jpg in this app's public/images/.
 */
export const AUTH_IMAGES: readonly AuthImageSlide[] = [
  {
    src: "/images/signup-admin.jpg",
    alt: "Debridgers operations",
    title: "Debridgers Careers",
    subtitle: "Recruitment and people ops in one place.",
  },
];
