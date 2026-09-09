import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PrimaryButton, applyServerFieldErrors } from "@debridgers/ui-web";
import {
  ApiError,
  createJob,
  listJobsForHr,
  type HrJob,
} from "@debridgers/api-client";

const schema = z.object({
  title: z.string().min(2),
  department: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(10),
  requirements: z.string().min(10),
});

type Values = z.infer<typeof schema>;

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<HrJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      department: "",
      location: "Kaduna",
      description: "",
      requirements: "",
    },
  });

  async function reload() {
    const rows = await listJobsForHr();
    setJobs(rows);
  }

  useEffect(() => {
    reload().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load jobs"),
    );
  }, []);

  const onCreate = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await createJob(values);
      form.reset({
        title: "",
        department: "",
        location: "Kaduna",
        description: "",
        requirements: "",
      });
      setShowForm(false);
      await reload();
    } catch (err) {
      applyServerFieldErrors(err, form);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Create failed",
      );
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-open-sans text-body text-sm">
          Manage open roles and move candidates through the pipeline.
        </p>
        <PrimaryButton
          type="button"
          className="rounded-full px-4 py-2 text-sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "New job"}
        </PrimaryButton>
      </div>

      {showForm && (
        <form
          onSubmit={onCreate}
          className="border-line grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2"
        >
          {(
            [
              ["title", "Title"],
              ["department", "Department"],
              ["location", "Location"],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex flex-col gap-1">
              <span className="font-open-sans text-xs font-medium">
                {label}
              </span>
              <input
                className="border-line rounded-xl border px-3 py-2 text-sm"
                {...form.register(name)}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-open-sans text-xs font-medium">
              Description
            </span>
            <textarea
              className="border-line min-h-24 rounded-xl border px-3 py-2 text-sm"
              {...form.register("description")}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-open-sans text-xs font-medium">
              Requirements
            </span>
            <textarea
              className="border-line min-h-24 rounded-xl border px-3 py-2 text-sm"
              {...form.register("requirements")}
            />
          </label>
          {error && (
            <p className="text-error-red text-sm sm:col-span-2">{error}</p>
          )}
          <div className="sm:col-span-2">
            <PrimaryButton
              type="submit"
              disabled={form.formState.isSubmitting}
              className="rounded-full px-4 py-2 text-sm"
            >
              Publish job
            </PrimaryButton>
          </div>
        </form>
      )}

      {error && !showForm && (
        <p className="font-open-sans text-error-red text-sm">{error}</p>
      )}

      <ul className="flex flex-col gap-3">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="border-line flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"
          >
            <div>
              <p className="font-syne text-heading font-semibold">
                {job.title}
              </p>
              <p className="font-open-sans text-body text-xs">
                {job.department} · {job.location} · {job.status}
              </p>
            </div>
            <Link
              to={`/hr-dashboard/recruitment/jobs/${job.id}`}
              className="text-primary font-open-sans text-sm font-semibold"
            >
              Pipeline →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
