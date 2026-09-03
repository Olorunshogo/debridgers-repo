import { LegalBlockView } from "./legal-block";
import type { LegalSection } from "../../types/legal-document";

/*
 * Recursive over section.children so 7.1 nests under 7 as markup, not just as
 * a flattened heading. scroll-mt-24 keeps an anchor link from landing under
 * the sticky header; the heading tag is derived from depth rather than fixed,
 * capped at h4 so a deeply nested clause never outgrows body text.
 */

// === Types

export interface LegalSectionViewProps {
  section: LegalSection;
  /** 0 for a top-level section, incremented per nesting level. */
  depth?: number;
}

// === Component

export function LegalSectionView({
  section,
  depth = 0,
}: LegalSectionViewProps): React.ReactElement {
  const HeadingTag = headingTagForDepth(depth);
  const headingSize = headingSizeForDepth(depth);

  return (
    <section id={section.id} className="flex scroll-mt-24 flex-col gap-4">
      <HeadingTag className={`font-syne text-heading font-bold ${headingSize}`}>
        {section.number && (
          <span className="text-primary mr-2">{section.number}</span>
        )}
        {section.heading}
      </HeadingTag>

      {section.blocks && section.blocks.length > 0 && (
        <div className="flex flex-col gap-3">
          {section.blocks.map((block, i) => (
            <LegalBlockView key={i} block={block} />
          ))}
        </div>
      )}

      {section.children && section.children.length > 0 && (
        <div className="flex flex-col gap-6 pl-4 sm:pl-6">
          {section.children.map((child) => (
            <LegalSectionView
              key={child.id}
              section={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// === Helpers

function headingTagForDepth(depth: number): "h2" | "h3" | "h4" {
  if (depth <= 0) return "h2";
  if (depth === 1) return "h3";
  return "h4";
}

function headingSizeForDepth(depth: number): "text-h2" | "text-h3" | "text-h4" {
  if (depth <= 0) return "text-h2";
  if (depth === 1) return "text-h3";
  return "text-h4";
}
