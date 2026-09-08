import type { Route } from "./+types/legal.$slug";
import { Link, data } from "react-router";
import { LegalDocumentView, getLegalDocument } from "@debridgers/ui-web";
import { buildPageMeta } from "../../lib/seo";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "@debridgers/ui-web";
import { marketingNavLinks } from "@/components/marketing/data/data";

/*
 * One page for every legal document.
 * The slug selects the content; the renderer is shared.
 * Publishing the agent agreement means adding its data file to the registry, and this file does not change.
 */

// === Data

export function loader({ params }: Route.LoaderArgs) {
  const document = getLegalDocument(params.slug);

  /*
   * A 404 rather than a redirect.
   * An unknown slug is usually a stale link in an email or a contract, and quietly serving a different document would let a customer believe they had read the one they asked for.
   */
  if (!document) {
    throw data("Document not found", { status: 404 });
  }

  return { document };
}

// === Metadata

export function meta({ data: loaderData }: Route.MetaArgs) {
  const document = loaderData?.document;

  if (!document) {
    return buildPageMeta({
      title: "Document Not Found | Debridgers",
      description: "The legal document you're looking for doesn't exist.",
      path: "/legal",
      noIndex: true,
    });
  }

  const description =
    document.subtitle ??
    `${document.title}, version ${document.version}, effective ${document.effectiveDate}.`;

  return buildPageMeta({
    title: `${document.title} | Debridgers`,
    description,
    path: `/legal/${document.slug}`,
    type: "article",
    image: false,
  });
}

// === Page

export default function LegalDocumentPage({
  loaderData,
}: Route.ComponentProps) {
  const { isAuthenticated, dashboardPath } = useAuth();

  return (
    <>
      {/*
        No hero on this page, so the header is told it sits on a solid surface.
        Left to guess from scroll position it renders a white pill on white.
      */}
      <Header
        navLinks={marketingNavLinks}
        signUpHref="/signup"
        surface="solid"
        isAuthenticated={isAuthenticated}
        dashboardPath={dashboardPath}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <LegalDocumentView doc={loaderData.document} />
      </div>
    </>
  );
}

// === Not found

export function ErrorBoundary() {
  return (
    <>
      <Header
        navLinks={marketingNavLinks}
        signUpHref="/signup"
        surface="solid"
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 pt-28 pb-20 sm:px-6">
        <h1 className="font-syne text-heading text-h2 font-bold">
          We could not find that document
        </h1>
        <p className="text-body">
          The link may be out of date. Our published documents are listed in the
          footer, and support can send you the current version.
        </p>
        <Link
          to="/contact"
          className="text-primary font-semibold underline underline-offset-2"
        >
          Contact us
        </Link>
      </div>
    </>
  );
}
