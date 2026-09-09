import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AppLogo,
  PrimaryButton,
  applyServerFieldErrors,
} from "@debridgers/ui-web";
import {
  ApiError,
  applyToJob,
  getOpenJob,
  type HrJob,
} from "@debridgers/api-client";
import { MapPin } from "lucide-react";

const applySchema = z
  .object({
    first_name: z.string().min(2),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    cover_letter: z.string().optional(),
    password: z.string().min(8),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ApplyValues = z.infer<typeof applySchema>;

const fieldClass =
  "border-line font-open-sans rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";

export default function CareerJobPage() {
  const { id } = useParams();
  const jobId = Number(id);
  const [job, setJob] = useState<HrJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [cv, setCv] = useState<File | null>(null);

  const form = useForm<ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      cover_letter: "",
      password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (!Number.isFinite(jobId)) {
      setError("Invalid job");
      return;
    }
    getOpenJob(jobId)
      .then(setJob)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Job not found"),
      );
  }, [jobId]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await applyToJob(jobId, { ...values, cv });
      setDone(true);
    } catch (err) {
      applyServerFieldErrors(err, form);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Application failed",
      );
    }
  });

  return (
    <div className="bg-dash-page-bg min-h-screen">
      <header className="border-line sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="section-max-width mx-auto flex items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
          <AppLogo />
          <Link
            to="/careers"
            className="font-open-sans text-primary text-sm font-semibold hover:opacity-80"
          >
            All roles
          </Link>
        </div>
      </header>

      <main className="section-max-width mx-auto w-full px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-12">
          <div>
            {job && (
              <>
                <p className="font-open-sans text-primary text-xs font-semibold tracking-wide uppercase">
                  {job.department}
                </p>
                <h1 className="font-syne text-heading mt-2 text-3xl font-bold sm:text-4xl">
                  {job.title}
                </h1>
                <p className="font-open-sans text-body mt-3 flex items-center gap-1.5 text-sm">
                  <MapPin className="text-icon-secondary h-3.5 w-3.5 shrink-0" />
                  {job.location}
                </p>

                <section className="font-open-sans text-body mt-8 space-y-6 text-sm leading-relaxed whitespace-pre-wrap">
                  <div className="border-line rounded-2xl border bg-white p-5 sm:p-6">
                    <h2 className="font-syne text-heading mb-2 text-base font-semibold">
                      Description
                    </h2>
                    <p>{job.description}</p>
                  </div>
                  <div className="border-line rounded-2xl border bg-white p-5 sm:p-6">
                    <h2 className="font-syne text-heading mb-2 text-base font-semibold">
                      Requirements
                    </h2>
                    <p>{job.requirements}</p>
                  </div>
                </section>
              </>
            )}

            {!job && error && (
              <p className="font-open-sans text-error-red text-sm">{error}</p>
            )}
          </div>

          <div className="lg:sticky lg:top-24">
            {done ? (
              <div className="border-line rounded-2xl border bg-white p-6 shadow-sm">
                <p className="font-syne text-heading text-lg font-semibold">
                  Application received
                </p>
                <p className="font-open-sans text-body mt-2 text-sm leading-relaxed">
                  We will email you about next steps. You can sign in with the
                  password you set.
                </p>
                <Link
                  to="/login"
                  className="text-primary mt-4 inline-block text-sm font-semibold"
                >
                  Go to login →
                </Link>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="font-syne text-heading text-lg font-semibold">
                  Apply for this role
                </h2>
                <p className="font-open-sans text-body -mt-1 mb-1 text-xs">
                  Creates your applicant account so you can track the process.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["first_name", "First name"],
                      ["last_name", "Last name"],
                    ] as const
                  ).map(([name, label]) => (
                    <label key={name} className="flex flex-col gap-1">
                      <span className="font-open-sans text-heading text-xs font-medium">
                        {label}
                      </span>
                      <input className={fieldClass} {...form.register(name)} />
                      {form.formState.errors[name] && (
                        <span className="text-error-red text-xs">
                          {form.formState.errors[name]?.message}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {(
                  [
                    ["email", "Email"],
                    ["phone", "Phone"],
                  ] as const
                ).map(([name, label]) => (
                  <label key={name} className="flex flex-col gap-1">
                    <span className="font-open-sans text-heading text-xs font-medium">
                      {label}
                    </span>
                    <input className={fieldClass} {...form.register(name)} />
                    {form.formState.errors[name] && (
                      <span className="text-error-red text-xs">
                        {form.formState.errors[name]?.message}
                      </span>
                    )}
                  </label>
                ))}
                <label className="flex flex-col gap-1">
                  <span className="font-open-sans text-heading text-xs font-medium">
                    Cover letter
                  </span>
                  <textarea
                    className={`${fieldClass} min-h-24`}
                    {...form.register("cover_letter")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-open-sans text-heading text-xs font-medium">
                    CV (PDF or Word)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="font-open-sans text-body text-sm"
                    onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-open-sans text-heading text-xs font-medium">
                    Password
                  </span>
                  <input
                    type="password"
                    className={fieldClass}
                    {...form.register("password")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-open-sans text-heading text-xs font-medium">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    className={fieldClass}
                    {...form.register("confirm_password")}
                  />
                  {form.formState.errors.confirm_password && (
                    <span className="text-error-red text-xs">
                      {form.formState.errors.confirm_password.message}
                    </span>
                  )}
                </label>
                {error && (
                  <p className="font-open-sans text-error-red text-sm">
                    {error}
                  </p>
                )}
                <PrimaryButton
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="mt-2 w-full rounded-full px-5 py-3 text-sm"
                >
                  {form.formState.isSubmitting
                    ? "Submitting…"
                    : "Submit application"}
                </PrimaryButton>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
