import { LegalBlockView } from "./legal-block";
import { LegalSectionView } from "./legal-section";
import { LegalTableOfContents } from "./legal-toc";
import type { LegalDocument } from "../../types/legal-document";

/*
 * Page-level composition for a LegalDocument: title, the version/date header
 * a consent record is checked against, an optional revision history, intro
 * copy, then the table of contents beside the sections. Single column on
 * mobile because the TOC only earns a sidebar once there is room for one.
 */

// === Types

export interface LegalDocumentViewProps {
  doc: LegalDocument;
}

// === Component

export function LegalDocumentView({
  doc,
}: LegalDocumentViewProps): React.ReactElement {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <h1 className="font-syne text-heading text-h1 font-bold">
          {doc.title}
        </h1>
        {doc.subtitle && (
          <p className="text-body text-body-lg">{doc.subtitle}</p>
        )}
        <div className="text-body flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
          <span>Version {doc.version}</span>
          <span>Effective {doc.effectiveDate}</span>
          <span>Last revised {doc.lastRevised}</span>
        </div>
      </header>

      {doc.revisions && doc.revisions.length > 0 && (
        <RevisionHistoryTable revisions={doc.revisions} />
      )}

      {doc.intro && doc.intro.length > 0 && (
        <div className="flex flex-col gap-3">
          {doc.intro.map((block, i) => (
            <LegalBlockView key={i} block={block} />
          ))}
        </div>
      )}

      {/* TOC + sections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem_1fr]">
        <LegalTableOfContents sections={doc.sections} />

        <div className="flex flex-col gap-10">
          {doc.sections.map((section) => (
            <LegalSectionView key={section.id} section={section} />
          ))}
        </div>
      </div>

      {doc.closing && (
        <p className="text-body border-line border-t pt-6 text-sm italic">
          {doc.closing}
        </p>
      )}
    </article>
  );
}

// === Helpers

interface RevisionHistoryTableProps {
  revisions: LegalDocument["revisions"];
}

function RevisionHistoryTable({
  revisions,
}: RevisionHistoryTableProps): React.ReactElement | null {
  if (!revisions || revisions.length === 0) return null;

  return (
    <div className="border-line overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-light-bg">
          <tr>
            <th className="text-heading px-4 py-2 font-semibold">Version</th>
            <th className="text-heading px-4 py-2 font-semibold">Date</th>
            <th className="text-heading px-4 py-2 font-semibold">Summary</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={revision.version} className="border-line border-t">
              <td className="text-body px-4 py-2">{revision.version}</td>
              <td className="text-body px-4 py-2">{revision.date}</td>
              <td className="text-body px-4 py-2">{revision.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
