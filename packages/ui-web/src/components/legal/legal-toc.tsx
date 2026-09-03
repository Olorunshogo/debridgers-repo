import type { LegalSection } from "../../types/legal-document";

/*
 * Built straight from the section tree so a renumbering in the document data
 * cannot leave the table of contents out of sync with the anchors it links
 * to. Collapsed by default on mobile inside <details> so it does not push
 * the document below the fold; sticky on desktop once there is room beside
 * the content column.
 */

// === Types

export interface LegalTableOfContentsProps {
  sections: readonly LegalSection[];
}

interface LegalTocListProps {
  sections: readonly LegalSection[];
}

// === Component

export function LegalTableOfContents({
  sections,
}: LegalTableOfContentsProps): React.ReactElement {
  return (
    <>
      {/* Mobile: collapsed by default, above the content */}
      <details className="border-line rounded-xl border bg-white p-4 lg:hidden">
        <summary className="font-syne text-heading cursor-pointer font-semibold">
          Contents
        </summary>
        <nav aria-label="Table of contents" className="mt-3">
          <LegalTocList sections={sections} />
        </nav>
      </details>

      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="Table of contents"
        className="border-line hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:bg-white lg:p-4"
      >
        <p className="font-syne text-heading mb-3 font-semibold">Contents</p>
        <LegalTocList sections={sections} />
      </nav>
    </>
  );
}

// === Helpers

function LegalTocList({ sections }: LegalTocListProps): React.ReactElement {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="text-body hover:text-primary block py-1"
          >
            {section.number && (
              <span className="text-primary mr-1">{section.number}</span>
            )}
            {section.heading}
          </a>

          {section.children && section.children.length > 0 && (
            <ul className="border-line flex flex-col gap-1 border-l pl-3">
              {section.children.map((child) => (
                <li key={child.id}>
                  <a
                    href={`#${child.id}`}
                    className="text-body hover:text-primary block py-1"
                  >
                    {child.number && (
                      <span className="text-primary mr-1">{child.number}</span>
                    )}
                    {child.heading}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
