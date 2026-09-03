/*
 * The consent every /auth/register call must now carry.
 *
 * Kept in one place so a new terms version is a single edit here rather than a
 * hunt through six specs, and so a spec that forgets it fails loudly at the
 * fixture rather than mysteriously at the endpoint.
 */
export const TERMS_CONSENT = {
  accepted_terms: true,
  terms_document: "buyer-terms",
  terms_version: "1.0",
} as const;
