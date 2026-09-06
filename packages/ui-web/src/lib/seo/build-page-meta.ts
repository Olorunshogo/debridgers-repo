import type { MetaDescriptor } from "react-router";

/*
 * One factory per app, not one shared instance: each of debridgers-marketing,
 * debridgers-buyer, debridgers-agent and debridgers-admin has its own siteUrl
 * (a different subdomain), so each calls createPageMetaBuilder once with its
 * own defaults and every route in that app calls the buildPageMeta it gets
 * back. Change the og-image (or any other default) in one place and every
 * route using it picks it up immediately.
 *
 * OG/Twitter/canonical fields are all optional on SeoDefaults: only
 * debridgers-marketing's public pages need them. The dashboard apps supply
 * just siteName/siteUrl/author, and the builder skips the whole social-card
 * block for any noIndex page regardless.
 */

export interface SeoDefaults {
  siteName: string;
  siteUrl: string;
  author: string;
  /** Base keywords merged into every route's own, e.g. ["Debridgers", "Shop"]. */
  baseKeywords: readonly string[];
  /** Absolute https URL. Omit on an app with no public/indexable pages. */
  defaultImage?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageAlt?: string;
  /** e.g. "@debridgers". Omit on an app with no public/indexable pages. */
  twitterHandle?: string;
  /** e.g. "en_NG". */
  locale?: string;
}

export interface PageMetaInput {
  title: string;
  description: string;
  /** Route path from the site root, e.g. "/shop" - builds og:url/canonical. */
  path: string;
  /** Extra keywords for this route, merged with (not replacing) baseKeywords. */
  keywords?: readonly string[];
  /**
   * Overrides defaults.defaultImage for a route that wants its own card. Pass
   * `false` (not just omitting this) to explicitly suppress the card image
   * for a route that still wants og:title/og:description - a legal document,
   * for instance - rather than falling back to defaults.defaultImage.
   */
  image?: string | false;
  imageAlt?: string;
  type?: "website" | "article";
  /**
   * True for every auth/dashboard route: skips the whole OG/Twitter/canonical
   * block (a private page has no business declaring a social card) and sets
   * robots to noindex, nofollow.
   */
  noIndex?: boolean;
}

export type BuildPageMeta = (input: PageMetaInput) => MetaDescriptor[];

export function createPageMetaBuilder(defaults: SeoDefaults): BuildPageMeta {
  return function buildPageMeta(input: PageMetaInput): MetaDescriptor[] {
    const keywords = [...defaults.baseKeywords, ...(input.keywords ?? [])].join(
      ", ",
    );

    const tags: MetaDescriptor[] = [
      { title: input.title },
      { name: "description", content: input.description },
      { name: "keywords", content: keywords },
      { name: "author", content: defaults.author },
      {
        name: "robots",
        content: input.noIndex ? "noindex, nofollow" : "index, follow",
      },
    ];

    if (input.noIndex) return tags;

    const url = `${defaults.siteUrl}${input.path}`;
    const image =
      input.image === false
        ? undefined
        : (input.image ?? defaults.defaultImage);
    const imageAlt = input.imageAlt ?? defaults.imageAlt;

    tags.push({ tagName: "link", rel: "canonical", href: url });

    tags.push(
      { property: "og:type", content: input.type ?? "website" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: defaults.siteName },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:locale", content: defaults.locale ?? "en_NG" },
      {
        name: "twitter:card",
        content: image ? "summary_large_image" : "summary",
      },
      { name: "twitter:url", content: url },
      { name: "twitter:title", content: input.title },
      { name: "twitter:description", content: input.description },
    );

    if (defaults.twitterHandle) {
      tags.push({ name: "twitter:site", content: defaults.twitterHandle });
    }

    if (image) {
      tags.push(
        { property: "og:image", content: image },
        { property: "og:image:alt", content: imageAlt ?? input.title },
        { name: "twitter:image", content: image },
        { name: "twitter:image:alt", content: imageAlt ?? input.title },
      );
      if (defaults.imageWidth) {
        tags.push({ property: "og:image:width", content: defaults.imageWidth });
      }
      if (defaults.imageHeight) {
        tags.push({
          property: "og:image:height",
          content: defaults.imageHeight,
        });
      }
    }

    return tags;
  };
}
