import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  listMyApplications,
  scheduleMyInterview,
  type HrApplication,
  type HrInterview,
  type HrJob,
} from "@debridgers/api-client";

const CAN_SCHEDULE = new Set(["received", "screening", "passed"]);

const fieldClass =
  "border-line font-open-sans mt-1 block w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<
    {
      application: HrApplication;
      job: HrJob;
      interview: HrInterview | null;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [interviewAt, setInterviewAt] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("Video call");

  async function reload() {
    const next = await listMyApplications();
    setRows(next);
  }

  useEffect(() => {
    reload().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
  }, []);

  async function onSchedule(applicationId: number) {
    setBusyId(applicationId);
    setError(null);
    setMessage(null);
    try {
      await scheduleMyInterview(applicationId, {
        scheduled_at: new Date(interviewAt).toISOString(),
        location: interviewLocation || "Video call",
      });
      setMessage("Interview scheduled. Check your email for confirmation.");
      setActiveId(null);
      setInterviewAt("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="font-open-sans text-body max-w-140 text-sm">
        Track each application here. When you are ready, pick an interview time
        and we will notify the hiring team.
      </p>
      {error && (
        <p className="font-open-sans text-error-red text-sm">{error}</p>
      )}
      {message && (
        <p className="font-open-sans text-primary text-sm">{message}</p>
      )}
      <ul className="flex w-full flex-col gap-3">
        {rows.map(({ application, job, interview }) => (
          <li
            key={application.id}
            className="border-line w-full rounded-2xl border bg-white p-4 sm:p-5"
          >
            <p className="font-syne text-heading font-semibold">{job.title}</p>
            <p className="font-open-sans text-body text-xs">
              {job.department} · {job.location} · status: {application.status}
            </p>
            {interview && (
              <p className="font-open-sans text-body mt-2 text-sm">
                Interview:{" "}
                {String(interview.scheduled_at).slice(0, 16).replace("T", " ")}{" "}
                · {interview.location ?? "TBD"} · {interview.status}
              </p>
            )}

            {CAN_SCHEDULE.has(application.status) && (
              <div className="mt-4 w-full">
                {activeId === application.id ? (
                  <div className="flex w-full max-w-120 flex-col gap-3">
                    <label className="flex w-full flex-col gap-1">
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
                    <label className="flex w-full flex-col gap-1">
                      <span className="font-open-sans text-heading text-xs font-medium">
                        Location / link
                      </span>
                      <input
                        className={fieldClass}
                        value={interviewLocation}
                        onChange={(e) => setInterviewLocation(e.target.value)}
                        placeholder="Video call or office address"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={busyId === application.id || !interviewAt}
                        className="font-syne bg-primary inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onSchedule(application.id)}
                      >
                        {busyId === application.id
                          ? "Saving…"
                          : interview
                            ? "Reschedule"
                            : "Confirm interview"}
                      </button>
                      <button
                        type="button"
                        className="font-open-sans text-body text-sm underline"
                        onClick={() => setActiveId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="font-syne bg-primary inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white"
                    onClick={() => {
                      setActiveId(application.id);
                      setInterviewAt("");
                      setInterviewLocation(interview?.location || "Video call");
                    }}
                  >
                    {interview ? "Reschedule interview" : "Schedule interview"}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && !error && (
          <li className="font-open-sans text-body text-sm">
            No applications yet.{" "}
            <Link to="/careers" className="text-primary font-semibold">
              Browse careers
            </Link>
          </li>
        )}
      </ul>
      <Link
        to="/hr-dashboard/offers"
        className="text-primary font-open-sans text-sm font-semibold"
      >
        View offers →
      </Link>
    </div>
  );
}
