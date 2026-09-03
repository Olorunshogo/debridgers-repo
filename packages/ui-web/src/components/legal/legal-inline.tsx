import { Fragment } from "react";
import { Link } from "react-router";
import { isExternalHref } from "../../lib/is-external-href";
import type { LegalInline } from "../../types/legal-document";

/*
 * Renders a run of LegalInline content. A link chooses a real anchor or a
 * react-router Link based on isExternalHref, the same rule SecondaryLink
 * uses, so an internal link keeps client-side routing and an external one
 * gets a real navigation and a new tab.
 */

// === Types

export interface LegalInlineContentProps {
  content: readonly LegalInline[];
}

// === Component

export function LegalInlineContent({
  content,
}: LegalInlineContentProps): React.ReactElement {
  return (
    <>
      {content.map((run, i) => (
        <Fragment key={i}>{renderInline(run)}</Fragment>
      ))}
    </>
  );
}

// === Helpers

function renderInline(run: LegalInline): React.ReactNode {
  if (typeof run === "string") return run;

  if (run.type === "strong") return <strong>{run.text}</strong>;

  if (isExternalHref(run.href)) {
    return (
      <a
        href={run.href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {run.text}
      </a>
    );
  }

  return (
    <Link to={run.href} className="text-primary underline underline-offset-2">
      {run.text}
    </Link>
  );
}
