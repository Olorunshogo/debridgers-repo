import { LegalInlineContent } from "./legal-inline";
import type { LegalBlock } from "../../types/legal-document";

/*
 * A switch over the LegalBlock union. Exhaustive on purpose: a block type
 * added to the content model without a case here fails typecheck instead of
 * silently rendering nothing.
 */

// === Types

export interface LegalBlockViewProps {
  block: LegalBlock;
}

// === Component

export function LegalBlockView({
  block,
}: LegalBlockViewProps): React.ReactElement {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-body text-sm leading-relaxed sm:text-base">
          <LegalInlineContent content={block.content} />
        </p>
      );

    case "definition":
      return (
        <p className="text-body text-sm leading-relaxed sm:text-base">
          <strong className="text-heading">{block.term}</strong>{" "}
          <LegalInlineContent content={block.content} />
        </p>
      );

    case "quote":
      return (
        <blockquote className="border-primary text-body border-l-4 pl-4 text-sm leading-relaxed italic sm:text-base">
          <p>
            <LegalInlineContent content={block.content} />
          </p>
          {block.attribution && (
            <footer className="text-heading mt-2 text-xs font-semibold not-italic">
              {block.attribution}
            </footer>
          )}
        </blockquote>
      );

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`text-body flex flex-col gap-2 text-sm leading-relaxed sm:text-base ${
            block.ordered ? "list-decimal pl-5" : "list-disc pl-5"
          }`}
        >
          {block.items.map((item, i) => (
            <li key={i}>
              <LegalInlineContent content={item} />
            </li>
          ))}
        </Tag>
      );
    }

    case "contact":
      return (
        <dl className="border-line flex flex-col gap-2 rounded-xl border p-4 text-sm sm:text-base">
          {block.entries.map((entry) => (
            <div key={entry.label} className="flex flex-wrap gap-2">
              <dt className="text-heading font-semibold">{entry.label}</dt>
              <dd className="text-body">
                {entry.href ? (
                  <a
                    href={entry.href}
                    className="text-primary underline underline-offset-2"
                  >
                    {entry.value}
                  </a>
                ) : (
                  entry.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      );

    case "note":
      return (
        <p className="text-body bg-light-bg border-line rounded-xl border p-4 text-xs leading-relaxed sm:text-sm">
          <LegalInlineContent content={block.content} />
        </p>
      );
  }
}
