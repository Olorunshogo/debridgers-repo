/*
 * The shape of a legal document: terms, a privacy policy, an agent agreement.
 *
 * The TYPE lives here because the shared renderer consumes it. The DOCUMENTS
 * themselves stay in the consuming app - what a role has agreed to is company
 * policy, not shared UI, exactly as ROLE_SIGNUP_CONFIG is.
 *
 * Content is data rather than markup so a document can be rendered, linked to
 * by clause, and version-compared without a component knowing what a buyer is.
 * Adding the agent agreement is one data file and one registry entry.
 */

// === Inline content

/*
 * A run of text inside a block.
 *
 * A link is data rather than an anchor element so a content file never imports
 * React. That is what keeps a document portable: the same object can be
 * rendered to a page, and later to an email or a PDF, with no rewrite.
 */
export type LegalInline =
  | string
  | { type: "link"; text: string; href: string }
  | { type: "strong"; text: string };

// === Blocks

export interface LegalParagraphBlock {
  type: "paragraph";
  content: readonly LegalInline[];
}

/*
 * One entry in a Definitions section: the defined term and its meaning. Kept
 * distinct from a paragraph because the term is quoted and bound throughout the
 * document, so it is styled and anchored as a definition rather than as prose.
 */
export interface LegalDefinitionBlock {
  type: "definition";
  term: string;
  content: readonly LegalInline[];
}

/** A clause quoted verbatim, set apart from the surrounding explanation. */
export interface LegalQuoteBlock {
  type: "quote";
  content: readonly LegalInline[];
  attribution?: string;
}

export interface LegalListBlock {
  type: "list";
  ordered?: boolean;
  items: readonly (readonly LegalInline[])[];
}

/** A labelled contact line: "Email", "support@debridgers.com". */
export interface LegalContactBlock {
  type: "contact";
  entries: readonly { label: string; value: string; href?: string }[];
}

/** An aside that is not itself a term: an effective date, a pointer, a caveat. */
export interface LegalNoteBlock {
  type: "note";
  content: readonly LegalInline[];
}

export type LegalBlock =
  | LegalParagraphBlock
  | LegalDefinitionBlock
  | LegalQuoteBlock
  | LegalListBlock
  | LegalContactBlock
  | LegalNoteBlock;

// === Sections

/*
 * A numbered section, which may contain numbered subsections.
 *
 * `children` is what lets 7.1 and 27.6 nest rather than being flattened into
 * headings that only look nested. The table of contents and the anchor ids are
 * both derived from this tree, so a renumbering cannot leave them disagreeing.
 */
export interface LegalSection {
  /** Anchor fragment, stable across revisions so an old link keeps working. */
  id: string;
  /** Clause number as displayed, "7" or "10.8". Omitted for an unnumbered section. */
  number?: string;
  heading: string;
  blocks?: readonly LegalBlock[];
  children?: readonly LegalSection[];
}

// === Document

export interface LegalRevision {
  version: string;
  date: string;
  summary: string;
}

export interface LegalDocument {
  /** Registry key and URL segment: /legal/<slug>. */
  slug: string;
  title: string;
  subtitle?: string;
  /*
   * The version a consent is recorded against. A signup stores this string, so
   * a revision that changes obligations must raise it or the record will claim
   * the user agreed to text they never saw.
   */
  version: string;
  effectiveDate: string;
  lastRevised: string;
  revisions?: readonly LegalRevision[];
  /** Preamble before the first numbered section. */
  intro?: readonly LegalBlock[];
  sections: readonly LegalSection[];
  /** Closing line under the last section, "These Terms are effective as of...". */
  closing?: string;
}
