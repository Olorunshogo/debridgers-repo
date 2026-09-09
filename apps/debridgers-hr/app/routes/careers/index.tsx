import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AppLogo } from "@debridgers/ui-web";
import { listOpenJobs, type HrJob } from "@debridgers/api-client";
import { ArrowRight, MapPin } from "lucide-react";

export default function CareersIndex() {
  const [jobs, setJobs] = useState<HrJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOpenJobs()
      .then(setJobs)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load jobs"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-dash-page-bg min-h-screen">
      <header className="border-line sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="section-max-width mx-auto flex items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
          <AppLogo />
          <Link
            to="/login"
            className="font-open-sans text-primary text-sm font-semibold hover:opacity-80"
          >
            Staff login
          </Link>
        </div>
      </header>

      <main className="section-max-width mx-auto w-full px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="max-w-180">
          <p className="font-open-sans text-primary text-sm font-semibold tracking-wide uppercase">
            Careers
          </p>
          <h1 className="font-syne text-heading mt-2 text-3xl font-bold sm:text-4xl">
            Careers at Debridgers
          </h1>
          <p className="font-open-sans text-body mt-3 max-w-140 text-base leading-relaxed">
            Open roles across operations, technology, and the field. Build the
            systems that move food reliably across Kaduna.
          </p>
        </div>

        {loading && (
          <p className="font-open-sans text-body mt-10 text-sm">
            Loading roles…
          </p>
        )}
        {error && (
          <p className="font-open-sans text-error-red mt-10 text-sm">{error}</p>
        )}

        <ul className="mt-10 flex max-w-220 flex-col gap-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                to={`/careers/${job.id}`}
                className="border-line group hover:border-primary/40 flex flex-col gap-4 rounded-2xl border bg-white p-5 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-open-sans text-primary text-xs font-semibold tracking-wide uppercase">
                    {job.department}
                  </p>
                  <h2 className="font-syne text-heading mt-1 text-xl font-semibold">
                    {job.title}
                  </h2>
                  <p className="font-open-sans text-body mt-2 flex items-center gap-1.5 text-sm">
                    <MapPin className="text-icon-secondary h-3.5 w-3.5 shrink-0" />
                    {job.location}
                  </p>
                </div>
                <span className="font-syne bg-primary inline-flex w-auto shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white">
                  View & apply
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
          {!loading && !error && jobs.length === 0 && (
            <li className="border-line rounded-2xl border border-dashed bg-white px-6 py-10 text-center">
              <p className="font-open-sans text-body text-sm">
                No open roles right now. Check back soon.
              </p>
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}
