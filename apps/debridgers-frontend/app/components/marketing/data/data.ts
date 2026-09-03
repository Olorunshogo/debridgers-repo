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
  { label: "About", href: "/about" },
  { label: "Shop", href: "/shop" },
  // { label: "Agents", href: "/agents" },
  { label: "Contact Us", href: "/contact" },
];

/*
 * The single copy of the vision and mission statements. The about page reads
 * these directly rather than retyping them, so a wording change happens once.
 */
export const VISION: string =
  "To become the world's most trusted and innovative agricultural supply company owning every step of the process, from seed to delivery, through technology, integrity and excellence.";

export const MISSION: string =
  "To source and deliver the world's essential food commodities directly from trusted local farmers to every household, business, and institution on the planet, building toward a supply chain we own end to end.";
