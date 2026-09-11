/*
 * Single source of truth for every customer-facing Debridgers contact detail.
 * The footer, landing header, contact page and both dashboard help centres all
 * read from here, so a number or address only ever changes in one place.
 */

// === Types

export interface SupportChannels {
  /* E.164, no spaces. Safe for tel: and wa.me. */
  phone: string;
  /* Human-readable form of the same number, for display only. */
  phoneDisplay: string;
  supportEmail: string;
  partnerEmail?: string;
  /* Plain-language availability, shown next to the phone and chat channels. */
  hours: string;
  linkedin: string;
}

// === Contacts

export const SUPPORT: SupportChannels = {
  phone: "+2347012288798",
  phoneDisplay: "0701 228 8798",
  supportEmail: "support@debridgers.com",
  // partnerEmail: "partner@debridgers.com",
  hours: "Mon - Fri, 9am - 5pm",
  linkedin: "https://www.linkedin.com/company/debridgers",
};

// === Link builders

export const supportTelHref = `tel:${SUPPORT.phone}`;
export const supportMailtoHref = `mailto:${SUPPORT.supportEmail}`;
export const partnerMailtoHref = `mailto:${SUPPORT.partnerEmail}`;

/*
 * Direct one-to-one chat with support, deliberately not a group invite: a
 * buyer reporting a problem sends their order number and delivery address,
 * which must not land in a room full of other customers.
 *
 * Pass `message` to pre-fill the composer, e.g. the order the buyer is
 * complaining about, so support opens the chat already knowing the context.
 */
export function supportWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${SUPPORT.phone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
