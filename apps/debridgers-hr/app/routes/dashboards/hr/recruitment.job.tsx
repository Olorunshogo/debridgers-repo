import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  createOffer,
  getApplicationCvUrl,
  listApplications,
  scheduleInterview,
  screenApplication,
  type HrApplication,
} from "@debridgers/api-client";

const fieldClass =
  "border-line font-open-sans block w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";

const btnPrimary =
  "font-syne bg-primary inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-50";

const btnDanger =
  "font-syne inline-flex shrink-0 items-center justify-center rounded-full bg-red-700 px-4 py-2 text-xs font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-50";

const btnGhost =
  "font-syne border-line text-heading inline-flex shrink-0 items-center justify-center rounded-full border bg-white px-4 py-2 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";

function statusLabel(status: string): string {
  switch (status) {
    case "received":
      return "Received";
    case "screening":
      return "In screening";
    case "passed":
      return "Passed screening";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export default function RecruitmentJobPage() {
  const { id } = useParams();
  const jobId = Number(id);
  const [apps, setApps] = useState<HrApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [interviewAt, setInterviewAt] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("Video call");
  const [offerPosition, setOfferPosition] = useState("");
  const [engagement, setEngagement] = useState<"team" | "intern" | "volunteer">(
    "team",
  );
  const [offerSalaryNaira, setOfferSalaryNaira] = useState("");
  const [activeAppId, setActiveAppId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const rows = await listApplications(jobId);
    setApps(rows);
  }, [jobId]);

  useEffect(() => {
    if (!Number.isFinite(jobId)) {
      setError("Invalid job");
      return;
    }
    reload().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
  }, [jobId, reload]);

  async function run(
    applicationId: number,
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> {
    setBusyId(applicationId);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function openCv(applicationId: number) {
    setError(null);
    try {
      const { url } = await getApplicationCvUrl(applicationId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open CV");
    }
  }

  function onSendInterview(applicationId: number) {
    if (!interviewAt) {
      setError("Pick an interview date and time first");
      return;
    }
    const scheduled = new Date(interviewAt);
    if (Number.isNaN(scheduled.getTime())) {
      setError("Interview date/time is invalid");
      return;
    }
    if (scheduled.getTime() < Date.now()) {
      setError("Interview must be in the future");
      return;
    }
    return run(
      applicationId,
      () =>
        scheduleInterview(applicationId, {
          scheduled_at: scheduled.toISOString(),
          location: interviewLocation.trim() || "Video call",
        }),
      "Interview invite sent to the applicant",
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Link
        to="/hr-dashboard/recruitment"
        className="font-open-sans text-primary text-sm font-semibold"
      >
        ← All jobs
      </Link>

      {error && (
        <p className="font-open-sans text-error-red text-sm">{error}</p>
      )}
      {message && (
        <p className="font-open-sans text-primary text-sm">{message}</p>
      )}

      <ul className="flex w-full flex-col gap-4">
        {apps.map((app) => {
          const canPass =
            app.status === "received" || app.status === "screening";
          const canReject = app.status !== "rejected";
          const busy = busyId === app.id;

          return (
            <li
              key={app.id}
              className="border-line w-full rounded-2xl border bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-syne text-heading font-semibold">
                    {app.first_name} {app.last_name}
                  </p>
                  <p className="font-open-sans text-body text-xs">
                    {app.email} · {app.phone}
                  </p>
                  <p className="font-open-sans text-primary mt-1 text-xs font-semibold">
                    {statusLabel(app.status)}
                  </p>
                  {app.cv_url && (
                    <button
                      type="button"
                      className="text-primary mt-1 inline-block text-xs font-semibold underline"
                      onClick={() => openCv(app.id)}
                    >
                      View CV
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !canPass}
                    className={btnPrimary}
                    onClick={() =>
                      run(
                        app.id,
                        () => screenApplication(app.id, { status: "passed" }),
                        `${app.first_name} marked as passed screening`,
                      )
                    }
                  >
                    {app.status === "passed" ? "Already passed" : "Pass screen"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !canReject}
                    className={btnDanger}
                    onClick={() =>
                      run(
                        app.id,
                        () =>
                          screenApplication(app.id, {
                            status: "rejected",
                            rejection_feedback: "Not a fit at this time.",
                          }),
                        `Rejection emailed to ${app.first_name}`,
                      )
                    }
                  >
                    Reject (email)
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() =>
                      setActiveAppId(activeAppId === app.id ? null : app.id)
                    }
                  >
                    {activeAppId === app.id
                      ? "Hide actions"
                      : "Interview / offer"}
                  </button>
                </div>
              </div>

              {activeAppId === app.id && (
                <div className="border-line mt-4 grid gap-6 border-t pt-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <p className="font-syne text-heading text-sm font-semibold">
                      Schedule interview
                    </p>
                    <label className="flex flex-col gap-1">
                      <span className="font-open-sans text-heading text-xs font-medium">
                        Date & time
                      </span>
                      <input
                        type="datetime-local"
                        className={fieldClass}
                        value={interviewAt}
                        onChange={(e) => setInterviewAt(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-open-sans text-heading text-xs font-medium">
                        Location / link
                      </span>
                      <input
                        className={fieldClass}
                        value={interviewLocation}
                        onChange={(e) => setInterviewLocation(e.target.value)}
                        placeholder="Location / video link"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy || !interviewAt}
                      className={btnPrimary}
                      onClick={() => onSendInterview(app.id)}
                    >
                      Send interview invite
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-syne text-heading text-sm font-semibold">
                      Send offer (acceptance email)
                    </p>
                    <label className="flex flex-col gap-1">
                      <span className="font-open-sans text-heading text-xs font-medium">
                        Position title
                      </span>
                      <input
                        className={fieldClass}
                        value={offerPosition}
                        onChange={(e) => setOfferPosition(e.target.value)}
                        placeholder={`${app.first_name}'s role`}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-open-sans text-heading text-xs font-medium">
                        Engagement
                      </span>
                      <select
                        className={fieldClass}
                        value={engagement}
                        onChange={(e) => {
                          const next = e.target.value as
                            | "team"
                            | "intern"
                            | "volunteer";
                          setEngagement(next);
                          if (next !== "team") setOfferSalaryNaira("");
                        }}
                      >
                        <option value="team">Team (paid)</option>
                        <option value="intern">Intern (unpaid)</option>
                        <option value="volunteer">Volunteer (unpaid)</option>
                      </select>
                    </label>
                    {engagement === "team" && (
                      <label className="flex flex-col gap-1">
                        <span className="font-open-sans text-heading text-xs font-medium">
                          Monthly salary (naira)
                        </span>
                        <input
                          type="number"
                          min={1}
                          className={fieldClass}
                          value={offerSalaryNaira}
                          onChange={(e) => setOfferSalaryNaira(e.target.value)}
                          placeholder="e.g. 350000"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      disabled={
                        busy ||
                        (engagement === "team" &&
                          (!offerSalaryNaira || Number(offerSalaryNaira) <= 0))
                      }
                      className={btnPrimary}
                      onClick={() => {
                        const start = new Date(
                          Date.now() + 30 * 24 * 60 * 60 * 1000,
                        ).toISOString();
                        const expires = new Date(
                          Date.now() + 14 * 24 * 60 * 60 * 1000,
                        ).toISOString();
                        const position =
                          offerPosition.trim() ||
                          `${app.first_name} role`.trim();
                        const salary_kobo =
                          engagement === "team"
                            ? Math.round(Number(offerSalaryNaira) * 100)
                            : 0;
                        return run(
                          app.id,
                          () =>
                            createOffer(app.id, {
                              position,
                              engagement,
                              salary_kobo,
                              start_date: start,
                              expires_at: expires,
                            }),
                          `Offer emailed to ${app.first_name}`,
                        );
                      }}
                    >
                      Email offer letter
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {apps.length === 0 && (
          <li className="font-open-sans text-body text-sm">
            No applications for this job yet.
          </li>
        )}
      </ul>
    </div>
  );
}
