import { createPageMetaBuilder } from "@debridgers/ui-web";

/* Every route in this app is a private dashboard/auth page (noIndex: true), so no OG/Twitter/canonical defaults are configured - the builder never needs them here. */
export const buildPageMeta = createPageMetaBuilder({
  siteName: "Debridgers",
  siteUrl: "https://debridgers.com",
  author: "Debridgers Team",
  baseKeywords: ["Debridgers"],
});
