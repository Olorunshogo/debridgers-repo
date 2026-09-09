import { Link } from "react-router";
import { useAuth, PrimaryButton } from "@debridgers/ui-web";

export default function OverviewPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-syne text-heading text-2xl font-bold">
          Welcome back
        </h2>
        <p className="font-open-sans text-body mt-2 text-sm">
          Signed in as {user?.email} ({user?.role?.replace(/_/g, " ")}).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {user?.role === "admin" && (
          <Link
            to="/hr-dashboard/recruitment"
            className="border-line hover:border-primary rounded-2xl border bg-white p-5 transition"
          >
            <p className="font-syne text-heading font-semibold">Recruitment</p>
            <p className="font-open-sans text-body mt-1 text-sm">
              Post jobs, screen applicants, schedule interviews, send offers.
            </p>
          </Link>
        )}
        {(user?.role === "applicant" || user?.role === "employee") && (
          <Link
            to="/hr-dashboard/applications"
            className="border-line hover:border-primary rounded-2xl border bg-white p-5 transition"
          >
            <p className="font-syne text-heading font-semibold">
              My applications
            </p>
            <p className="font-open-sans text-body mt-1 text-sm">
              Track applications, book interviews, and respond to offers.
            </p>
          </Link>
        )}
        <Link
          to="/careers"
          className="border-line hover:border-primary rounded-2xl border bg-white p-5 transition"
        >
          <p className="font-syne text-heading font-semibold">Careers board</p>
          <p className="font-open-sans text-body mt-1 text-sm">
            Public open roles and apply flow.
          </p>
        </Link>
      </div>

      <div>
        <PrimaryButton
          type="button"
          className="rounded-full px-5 py-2.5 text-sm"
          onClick={() => {
            window.location.href = "/careers";
          }}
        >
          Browse open roles
        </PrimaryButton>
      </div>
    </div>
  );
}
