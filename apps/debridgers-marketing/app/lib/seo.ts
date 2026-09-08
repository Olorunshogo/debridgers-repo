import { createPageMetaBuilder } from "@debridgers/ui-web";

/*
 * The only app with public, indexable pages, so the only one carrying the full OG/Twitter defaults.
 * Change the og-image, site name, twitter handle or locale here once and every route calling buildPageMeta picks it up.
 */
export const buildPageMeta = createPageMetaBuilder({
  siteName: "Debridgers",
  siteUrl: "https://debridgers.com",
  author: "Debridgers Team",
  baseKeywords: ["Debridgers", "Shop", "Kaduna", "Nigeria", "food delivery"],
  defaultImage: "https://debridgers.com/og-image.png",
  imageWidth: "1200",
  imageHeight: "630",
  imageAlt: "Debridgers — fresh foodstuff at market prices in Kaduna",
  twitterHandle: "@debridgers",
  locale: "en_NG",
});
