/*
 * Navigation for the marketing pages, defined once.
 *
 * It used to be written inline on each page, which is exactly how "Agents"
 * ended up commented out on three of them, live on two, and present in the
 * footer under a third shape. Showing or hiding a link is now one edit here.
 *
 * Commenting an entry out only removes it from navigation. The route still
 * exists and the URL still resolves, which is what makes it safe to hide a page
 * while it is being reworked.
 */

export interface MarketingNavLink {
  label: string;
  href: string;
}

export const marketingNavLinks: readonly MarketingNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  // { label: "Agents", href: "/agents" },
  { label: "Contact Us", href: "/contact" },
];
