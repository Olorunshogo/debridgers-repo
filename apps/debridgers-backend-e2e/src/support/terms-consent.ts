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

/*
 * Agent application carries its own agreement, versioned separately from the
 * buyer terms above - see packages/ui-web/src/data/legal/agent-terms.ts,
 * which is the source these two values are copied from. Multipart, so unlike
 * TERMS_CONSENT this is consumed field by field via formData.append rather
 * than spread into a JSON body.
 */
export const AGENT_TERMS_CONSENT = {
  accepted_terms: "true",
  terms_document: "agent-terms",
  terms_version: "0.1",
} as const;
